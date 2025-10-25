import { join } from 'path';
import { Module, Injectable, UnauthorizedException, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule, GqlExecutionContext } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthGuard } from '@nestjs/passport';
import * as jwksRsa from 'jwks-rsa';

import { AgentModule } from './agent/agent.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { TemporalModule } from './temporal/temporal.module';

// =============================================================================
// INLINE AUTHENTICATION COMPONENTS
// =============================================================================
// These components implement JWT validation based on an OIDC-compliant Identity Provider
// using a JWKS (JSON Web Key Set) endpoint to fetch public keys for signature verification.

/**
 * @class JwtStrategy
 * @description A Passport strategy for validating JWTs. It uses the `jwks-rsa` library
 * to dynamically fetch the public key from the OIDC provider's JWKS endpoint.
 * It validates the token's signature, expiration, issuer, and audience.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const issuerUrl = configService.get<string>('IDENTITY_PROVIDER_URL');
    const audience = configService.get<string>('IDENTITY_PROVIDER_AUDIENCE');

    if (!issuerUrl || !audience) {
      const errorMsg =
        'Auth configuration (IDENTITY_PROVIDER_URL, IDENTITY_PROVIDER_AUDIENCE) is missing from environment variables.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuerUrl}/.well-known/jwks.json`,
      }),
      audience: audience,
      issuer: issuerUrl,
      algorithms: ['RS256'], // Standard algorithm for OIDC providers
    });
    this.logger.log(
      `JWT Strategy initialized with Issuer: ${issuerUrl}, Audience: ${audience}`,
    );
  }

  /**
   * Validates the decoded JWT payload after its signature and claims are verified by passport-jwt.
   * @param payload The decoded JWT payload.
   * @returns An object containing the user's ID and claims, which will be attached to `req.user`.
   */
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException(
        'Invalid token: Subject (sub) claim is missing.',
      );
    }
    return { userId: payload.sub, claims: payload };
  }
}

/**
 * @class JwtAuthGuard
 * @description A guard that uses the `JwtStrategy` to protect GraphQL resolvers.
 * It's applied globally to ensure all endpoints are secure by default.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Overrides the default getRequest method to correctly extract the request
   * object from a GraphQL execution context.
   * @param context The NestJS ExecutionContext.
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

// =============================================================================
// ROOT APPLICATION MODULE
// =============================================================================

/**
 * The root module for the AI Agent microservice.
 *
 * This module integrates all core architectural components for this service:
 * 1.  **Global Configuration**: Manages environment variables via `ConfigModule`.
 * 2.  **GraphQL Federation**: Exposes the service as a federated subgraph.
 * 3.  **Authentication**: Enforces JWT validation on all GraphQL requests using a global `JwtAuthGuard`.
 * 4.  **Event Bus**: Connects to Kafka for asynchronous inter-service communication.
 * 5.  **Workflow Orchestration**: Integrates with Temporal via the `TemporalModule` to manage
 *     durable, long-running business processes (Sagas), as per the architectural directive.
 * 6.  **Feature Logic**: Imports the core `AgentModule` which contains the business logic.
 */
@Module({
  imports: [
    // --- Core Infrastructure ---
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // --- Authentication ---
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),

    // --- GraphQL Federation ---
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Enable playground in non-production environments.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // --- Feature & Domain Modules ---
    AgentModule,
    EventBusModule,
    TemporalModule,
  ],
  providers: [
    // Register the JWT strategy for token validation.
    JwtStrategy,
    // Apply the JWT authentication guard globally to protect all GraphQL resolvers.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
