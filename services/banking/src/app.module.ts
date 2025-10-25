import { join } from 'path';
import { Module, Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule, GqlExecutionContext } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { BankingModule } from './banking.module';

// --- New Imports for Authentication --- 
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthGuard } from '@nestjs/passport';
import * as jwksRsa from 'jwks-rsa';

// =============================================================================
// INLINE AUTHENTICATION COMPONENTS
// =============================================================================
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

/**
 * The root module for the Banking microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings (e.g., environment variables via ConfigModule).
 * 2. Setting up the GraphQL server with Apollo Federation v2. This service will expose a subgraph.
 * 3. Integrating JWT authentication using an OIDC provider.
 * 4. Importing the primary feature module for the banking domain (`BankingModule`).
 * This module acts as an 'Adapter' in the Hexagonal Architecture, providing the GraphQL API entry point.
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      cache: true,
    }),

    // --- New Authentication Modules for OIDC JWT Validation --- 
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // JwtModule is imported for dependency injection, but our custom JwtStrategy
    // handles all validation logic, including key retrieval with jwks-rsa.
    JwtModule.register({}),

    // GraphQL module configured for Apollo Federation, set up asynchronously
    // to allow for dependency injection of the ConfigService.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      imports: [ConfigModule], // Make ConfigService available to the factory
      useFactory: (configService: ConfigService) => ({
        // Automatically generate the schema file which will be consumed by the gateway.
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Sort schema lexicographically for consistent schema generation.
        sortSchema: true,
        // Enable the GraphQL playground/sandbox UI only in non-production environments.
        playground: configService.get<string>('NODE_ENV') !== 'production',
        // Apply the authentication guard to all incoming GraphQL requests.
        // This ensures all resolvers are protected by default.
        context: ({ req }) => ({ req }), // Pass the request object to the GraphQL context for the guard
      }),
      inject: [ConfigService],
    }),

    // The primary feature module for this service.
    BankingModule,
  ],
  providers: [
    // Provide the JWT strategy for validating incoming tokens.
    JwtStrategy,
    // Apply the JwtAuthGuard globally to protect all GraphQL resolvers by default.
    // This enforces the security-first principle of the new architecture.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
