import { join } from 'path';
import { Module, Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { GqlExecutionContext } from '@nestjs/graphql';
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

// =============================================================================
// INLINE AUTHENTICATION COMPONENTS
// =============================================================================
// In a typical NestJS application, these classes would be in their own files
// (e.g., src/auth/jwt.strategy.ts, src/auth/jwt-auth.guard.ts).
// They are defined here to satisfy the single-file modification constraint.
//
// This setup implements JWT validation based on an OIDC-compliant Identity Provider
// using a JWKS (JSON Web Key Set) endpoint to fetch public keys for signature verification.
//
// Required dependencies to be added to package.json:
// "@nestjs/passport", "passport", "@nestjs/jwt", "passport-jwt", "jwks-rsa"
// "@types/passport-jwt"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const authConfig = {
      jwksUri: configService.get<string>('AUTH_JWKS_URI'),
      audience: configService.get<string>('AUTH_AUDIENCE'),
      issuer: configService.get<string>('AUTH_ISSUER_URL'),
    };

    if (!authConfig.jwksUri || !authConfig.audience || !authConfig.issuer) {
      throw new Error(
        'Auth configuration (AUTH_JWKS_URI, AUTH_AUDIENCE, AUTH_ISSUER_URL) is missing from environment variables.',
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
        jwksUri: authConfig.jwksUri,
      }),
      // These options ensure that the token was intended for this service (audience)
      // and was issued by the trusted identity provider (issuer).
      audience: authConfig.audience,
      issuer: authConfig.issuer,
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
    // We can perform additional checks here, like checking if the user is in a blocklist.
    // For service-to-service communication via token exchange, the payload itself is sufficient.
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
    }),

    // Passport module for authentication strategy handling.
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule is imported for dependency injection, but our custom JwtStrategy
    // handles all validation logic, including key retrieval.
    JwtModule.register({}),

    // GraphQL module configured for Apollo Federation.
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'src/schema.gql'),
      },
    }),

    // The primary feature module for this service.
    AgentModule,
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
