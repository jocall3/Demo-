import { join } from 'path';
import { Module, Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
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
// In a typical NestJS application, these classes would be in their own files
// (e.g., src/auth/jwt.strategy.ts, src/auth/jwt-auth.guard.ts).
// They are defined here to satisfy the single-file modification constraint.
//
// This setup implements JWT validation based on an OIDC-compliant Identity Provider
// using a JWKS (JSON Web Key Set) endpoint to fetch public keys for signature verification.

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const authConfig = {
      issuerUrl: configService.get<string>('IDENTITY_PROVIDER_URL'),
      audience: configService.get<string>('IDENTITY_PROVIDER_AUDIENCE'),
    };

    if (!authConfig.issuerUrl || !authConfig.audience) {
      throw new Error(
        'Auth configuration (IDENTITY_PROVIDER_URL, IDENTITY_PROVIDER_AUDIENCE) is missing from environment variables.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // The secretOrKeyProvider is the recommended method for using jwks-rsa with passport-jwt.
      // It dynamically fetches the correct public key from the JWKS endpoint based on the
      // key ID ('kid') in the incoming JWT's header.
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authConfig.issuerUrl}/.well-known/jwks.json`,
      }),
      // These options ensure that the token was intended for this service (audience)
      // and was issued by the trusted identity provider (issuer).
      audience: authConfig.audience,
      issuer: authConfig.issuerUrl,
      algorithms: ['RS256'], // Algorithm used by most OIDC providers like Keycloak, Auth0.
    });
  }

  /**
   * This method is called by passport after a token has been successfully validated.
   * Its return value is attached to the request object as `req.user`.
   * @param payload The decoded JWT payload.
   */
  async validate(payload: any) {
    // The payload is already validated at this point (signature, expiration, audience, issuer).
    if (!payload.sub) {
      throw new UnauthorizedException(
        'Invalid token: Subject (sub) claim is missing.',
      );
    }
    // We return an object that will be available in the GraphQL context.
    return { userId: payload.sub, claims: payload };
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * This override is required to make the Passport AuthGuard work with GraphQL.
   * It extracts the request object from the GraphQL execution context.
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

// =============================================================================
// ROOT APPLICATION MODULE
// =============================================================================

@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // Passport module for authentication strategy handling.
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule is imported for dependency injection, but our custom JwtStrategy
    // handles all validation logic, including key retrieval.
    JwtModule.register({}),

    // GraphQL module configured for Apollo Federation.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Enable playground in non-production environments for easier debugging.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // The primary feature module for this service.
    AgentModule,

    // Module for connecting to the event bus (e.g., Kafka).
    EventBusModule,

    // Module for workflow orchestration (e.g., Temporal).
    // This is the core of the new architectural change for handling long-running Sagas.
    TemporalModule,
  ],
  providers: [
    // The JWT strategy for validating incoming tokens.
    JwtStrategy,
    // Provide the JwtAuthGuard globally to protect all GraphQL resolvers by default.
    // This enforces the security-first principle of the new architecture.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}