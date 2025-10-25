/**
 * @file packages/opa-middleware/src/index.ts
 * @description A shared NestJS module for integrating with an Open Policy Agent (OPA) sidecar.
 * This package provides a configurable `OpaGuard` that enforces authorization for all incoming
 * requests by querying an OPA policy engine.
 *
 * @architectural-directive Externalize Authorization Logic with an Open Policy Agent (OPA) Sidecar Framework
 * This module is a direct implementation of the directive to decouple authorization logic from
 * microservices. It provides a reusable, configurable adapter that bridges NestJS applications
 * with an OPA sidecar, centralizing authorization decisions within the service mesh.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  Module,
  DynamicModule,
  Inject,
} from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { GqlExecutionContext } from '@nestjs/graphql';
import { lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';

// --- Public Interface & Configuration ---

/**
 * @description Injection token for the OPA module configuration options.
 */
export const OPA_MODULE_OPTIONS = 'OPA_MODULE_OPTIONS';

/**
 * @interface OpaModuleOptions
 * @description Configuration options for the OpaModule.
 * @property {string} url - The base URL of the OPA sidecar agent (e.g., 'http://localhost:8181').
 * @property {string} policyPath - The path to the policy decision rule in OPA (e.g., 'v1/data/app/authz/allow').
 */
export interface OpaModuleOptions {
  url: string;
  policyPath: string;
}

// --- OPA Service ---

/**
 * @class OpaService
 * @description A service responsible for communicating with the OPA sidecar.
 * It is configured via OpaModule and used by the OpaGuard to make authorization decisions.
 */
@Injectable()
export class OpaService {
  private readonly logger = new Logger(OpaService.name);
  private readonly opaDecisionUrl: string;

  constructor(
    @Inject(OPA_MODULE_OPTIONS) private readonly options: OpaModuleOptions,
    private readonly httpService: HttpService,
  ) {
    this.opaDecisionUrl = `${this.options.url.replace(/\/$/, '')}/${this.options.policyPath.replace(
      /^\//,
      '',
    )}`;
    this.logger.log(`OPA policy decision endpoint configured at: ${this.opaDecisionUrl}`);
  }

  /**
   * @method isAllowed
   * @description Queries the OPA sidecar to determine if a request is authorized.
   * @param {any} input - The input context to be sent to OPA for policy evaluation.
   * @returns {Promise<boolean>} A promise that resolves to true if allowed, false otherwise.
   */
  async isAllowed(input: any): Promise<boolean> {
    this.logger.debug('Querying OPA for authorization decision', { input });
    try {
      const response = await lastValueFrom(
        this.httpService.post(this.opaDecisionUrl, { input }),
      );

      const decision = response.data?.result;
      this.logger.debug(`OPA decision received: ${decision}`);

      return decision === true;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`OPA request failed: ${error.message}`, {
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        this.logger.error('An unexpected error occurred while querying OPA', (error as Error).stack);
      }
      // Fail-closed: If OPA is unreachable or returns an error, deny the request.
      return false;
    }
  }
}

// --- OPA Guard ---

/**
 * @class OpaGuard
 * @implements CanActivate
 * @description A NestJS guard that enforces authorization by querying an OPA sidecar.
 * It constructs an input object from the request context and uses the OpaService to get a decision.
 * This guard should be provided globally in the main application module.
 * @example
 * // In your AppModule's providers array:
 * {
 *   provide: APP_GUARD,
 *   useClass: OpaGuard,
 * }
 */
@Injectable()
export class OpaGuard implements CanActivate {
  private readonly logger = new Logger(OpaGuard.name);

  constructor(private readonly opaService: OpaService) {}

  /**
   * @method canActivate
   * @description Determines if the current request is authorized to proceed.
   * @param {ExecutionContext} context - The NestJS execution context for the incoming request.
   * @returns {Promise<boolean>} A promise that resolves to true if authorized, or throws a ForbiddenException if not.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = this.getRequest(context);
    const input = this.buildOpaInput(request);
    
    const allowed = await this.opaService.isAllowed(input);

    if (!allowed) {
      this.logger.warn(`Request DENIED by OPA policy. Input: ${JSON.stringify({ ...input, user: { ...input.user, token: '[REDACTED]' } })}`);
      throw new ForbiddenException('You are not authorized to perform this action.');
    }
    
    this.logger.debug(`Request ALLOWED by OPA policy.`);
    return true;
  }

  /**
   * @private
   * @method getRequest
   * @description Extracts the HTTP request object from either a REST or GraphQL context.
   * @param {ExecutionContext} context - The NestJS execution context.
   * @returns {any} The request object.
   */
  private getRequest(context: ExecutionContext): any {
    const contextType = context.getType<'http' | 'graphql'>();
    if (contextType === 'http') {
      return context.switchToHttp().getRequest();
    }
    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      return gqlContext.getContext().req;
    }
    this.logger.error(`Unsupported execution context type: ${contextType}`);
    throw new Error(`Unsupported execution context type: ${contextType}`);
  }

  /**
   * @private
   * @method buildOpaInput
   * @description Constructs the input object for OPA policy evaluation from the request.
   * @param {any} request - The HTTP request object.
   * @returns {object} The structured input for OPA.
   */
  private buildOpaInput(request: any): { method: string, path: string[], headers: Record<string, string>, user: { token: string | null, claims: any | null } } {
    const { method, originalUrl, headers } = request;

    // Sanitize path into an array of segments, removing empty segments from leading/trailing slashes.
    const path = originalUrl.split('?')[0].split('/').filter(Boolean);

    const token = headers.authorization?.replace('Bearer ', '') || null;
    let decodedToken: any | null = null;
    if (token) {
        try {
            // Decode the token to extract claims for the policy, without verifying the signature
            // as OPA can be configured to do that itself with the public key.
            decodedToken = jwt.decode(token);
        } catch (err) {
            this.logger.warn(`Could not decode JWT: ${(err as Error).message}`);
        }
    }

    return {
      method,
      path,
      headers,
      user: {
        token,
        claims: decodedToken,
      },
    };
  }
}

// --- OPA Module ---

/**
 * @module OpaModule
 * @description A NestJS module for integrating with Open Policy Agent (OPA).
 * It provides the OpaGuard for authorization and is configurable via a `forRoot` static method.
 *
 * @example
 * // In your AppModule
 * imports: [
 *   OpaModule.forRoot({
 *     url: 'http://localhost:8181',
 *     policyPath: 'v1/data/app/authz/allow'
 *   }),
 *   // ... other modules
 * ],
 * providers: [
 *   {
 *     provide: APP_GUARD,
 *     useClass: OpaGuard,
 *   }
 * ]
 */
@Module({
  imports: [HttpModule], // HttpModule is required by OpaService to make HTTP requests.
})
export class OpaModule {
  /**
   * @method forRoot
   * @description Configures the OpaModule with the necessary options.
   * @param {OpaModuleOptions} options - The configuration for the OPA client.
   * @returns {DynamicModule} The configured dynamic module with providers and exports.
   */
  static forRoot(options: OpaModuleOptions): DynamicModule {
    return {
      module: OpaModule,
      global: true, // Make the providers available globally for easier integration as a global guard.
      providers: [
        {
          provide: OPA_MODULE_OPTIONS,
          useValue: options,
        },
        OpaService,
        OpaGuard,
      ],
      exports: [OpaGuard, OpaService], // Export so they can be used in `APP_GUARD` provider.
    };
  }
}
