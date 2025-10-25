import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

/**
 * @interface OpaInput
 * @description Defines the structure of the input object sent to the OPA sidecar for an authorization decision.
 * The Rego policy will evaluate this input.
 */
interface OpaInput {
  /** The context of the incoming request. */
  input: {
    /** The decoded JWT payload of the authenticated user. */
    token: Record<string, any>;
    /** The request path, split into an array of strings. */
    path: string[];
    /** The HTTP method of the request. */
    method: string;
  };
}

/**
 * @interface OpaResponse
 * @description Defines the expected structure of the response from the OPA sidecar.
 */
interface OpaResponse {
  /** The authorization decision. `true` for allow, `false` for deny. */
  result: boolean;
}

/**
 * @class OpaMiddleware
 * @implements {NestMiddleware}
 * @description A NestJS middleware that externalizes authorization logic by querying a local Open Policy Agent (OPA) sidecar.
 *
 * @architectural_directive Externalize Authorization Logic with an Open Policy Agent (OPA) Sidecar Framework
 *
 * This middleware intercepts every incoming request to a microservice and performs the following steps:
 * 1. Extracts the user's JWT, the request path, and the HTTP method.
 * 2. Decodes the JWT payload to get user claims (e.g., sub, roles, permissions).
 * 3. Constructs a structured `input` object containing this request context.
 * 4. Sends the `input` object in a POST request to the OPA sidecar's policy endpoint.
 * 5. Receives an 'allow' or 'deny' decision from OPA.
 * 6. If allowed, the request proceeds to the controller.
 * 7. If denied, a 403 Forbidden HTTP exception is thrown, blocking the request.
 *
 * This pattern decouples the microservice's business logic from its authorization concerns, allowing
 * authorization policies to be managed, versioned, and deployed independently in a central repository.
 */
@Injectable()
export class OpaMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OpaMiddleware.name);
  private readonly opaDecisionUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Get the OPA decision endpoint from configuration, with a sensible default for Kubernetes sidecars.
    this.opaDecisionUrl = this.configService.get<string>(
      'OPA_DECISION_URL',
      'http://localhost:8181/v1/data/authz/allow',
    );
    this.logger.log(`OPA decision endpoint configured: ${this.opaDecisionUrl}`);
  }

  /**
   * The core middleware logic that is executed for each request.
   * @param {Request} req The Express request object.
   * @param {Response} res The Express response object.
   * @param {NextFunction} next The next middleware function in the chain.
   */
  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn('Authorization token missing. Denying access.');
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    try {
      // Decode JWT payload. Note: Signature validation is assumed to have been done
      // by an upstream gateway. This middleware only needs the claims for policy decisions.
      const payload = this.decodeJwtPayload(token);

      // Sanitize and split the path for the OPA input.
      const path = req.originalUrl.split('?')[0].split('/').filter(p => p);

      const opaInput: OpaInput = {
        input: {
          token: payload,
          path: path,
          method: req.method,
        },
      };

      this.logger.debug(
        `Querying OPA for decision: ${req.method} ${req.originalUrl} for user ${payload.sub}`,
      );
      
      const { data } = await firstValueFrom(
        this.httpService.post<OpaResponse>(this.opaDecisionUrl, opaInput),
      );

      if (data?.result === true) {
        this.logger.debug(`OPA decision: ALLOW for user ${payload.sub}`);
        next();
      } else {
        this.logger.warn(`OPA decision: DENY for user ${payload.sub} on ${req.method} ${req.originalUrl}`);
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      const axiosError = error as AxiosError;
      if (axiosError.isAxiosError) {
        this.logger.error(
          `Failed to contact OPA sidecar at ${this.opaDecisionUrl}. Denying access as a security precaution.`,
          axiosError.stack,
        );
        throw new HttpException(
          'Authorization service is unavailable.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      this.logger.error('An unexpected error occurred during OPA authorization.', error.stack);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Decodes the payload from a JWT string without verifying the signature.
   * @param {string} token The JWT string.
   * @returns {Record<string, any>} The decoded payload as a JSON object.
   */
  private decodeJwtPayload(token: string): Record<string, any> {
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      return JSON.parse(decodedJson);
    } catch (e) {
      this.logger.error('Failed to decode JWT payload.', e.stack);
      throw new HttpException('Invalid token format.', HttpStatus.UNAUTHORIZED);
    }
  }
}
