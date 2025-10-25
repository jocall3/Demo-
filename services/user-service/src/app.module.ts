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

import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { EventBusModule } from './event-bus/event-bus.module';

// =============================================================================
// INLINE AUTHENTICATION COMPONENTS
// =============================================================================
// This setup implements JWT validation based on an OIDC-compliant Identity Provider
// using a JWKS (JSON Web Key Set) endpoint to fetch public keys for signature verification.

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const authServerUrl = configService.get<string>('AUTH_SERVER_URL');
    const jwtAudience = configService.get<string>('JWT_AUDIENCE');

    if (!authServerUrl || !jwtAudience) {
      throw new Error(
        'Auth configuration (AUTH_SERVER_URL, JWT_AUDIENCE) is missing from environment variables.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // The secretOrKeyProvider dynamically fetches the correct public key from the JWKS endpoint
      // based on the key ID ('kid') in the incoming JWT's header.
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authServerUrl}/protocol/openid-connect/certs`,
      }),
      // These options ensure that the token was intended for this service (audience)
      // and was issued by the trusted identity provider (issuer).
      audience: jwtAudience,
      issuer: authServerUrl,
      algorithms: ['RS256'], // Standard algorithm used by OIDC providers like Keycloak
    });
  }

  /**
   * This method is called by passport after a token has been successfully validated.
   * Its return value is attached to the request object as `req.user`.
   * @param payload The decoded JWT payload.
   */
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException(
        'Invalid token: Subject (sub) claim is missing.',
      );
    }
    // Return an object that will be available in the GraphQL context.
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

/**
 * The root module for the User microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings (e.g., environment variables via ConfigModule).
 * 2. Setting up the GraphQL server as a federated subgraph. This service owns the `User` entity.
 * 3. Establishing a connection to the service's dedicated database.
 * 4. Integrating the message bus for event-driven communication.
 * 5. Integrating JWT-based authentication for all incoming GraphQL requests.
 */
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
        // Automatically generate the schema file.
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Sort schema alphabetically for consistent schema generation.
        sortSchema: true,
        // Enable the GraphQL playground in non-production environments.
        playground: configService.get<string>('NODE_ENV') !== 'production',
        // Apollo Server's context function to attach user info after JWT validation
        context: ({ req }) => ({ req }),
      }),
      inject: [ConfigService],
    }),

    // Infrastructure Modules
    DatabaseModule,
    EventBusModule,

    // Feature Module
    UserModule,
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
