import { join } from 'path';
import { Module, Injectable, UnauthorizedException, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule, GqlExecutionContext } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

import { AccountModule } from './account/account.module';
import { EventBusModule } from './event-bus/event-bus.module';

// =============================================================================
// INLINE AUTHENTICATION COMPONENTS
// =============================================================================
// These components are defined inline to meet the single-file modification constraint.
// In a larger, production-ready application, these would typically reside in separate
// files (e.g., src/auth/jwt.strategy.ts, src/auth/jwt-auth.guard.ts).
// This setup enforces JWT validation based on an OIDC-compliant Identity Provider
// using a JWKS (JSON Web Key Set) endpoint for signature verification.

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const issuerUrl = configService.get<string>('OIDC_ISSUER_URL');
    const audience = configService.get<string>('OIDC_AUDIENCE');

    if (!issuerUrl || !audience) {
      this.logger.error('OIDC configuration (OIDC_ISSUER_URL, OIDC_AUDIENCE) is missing from environment variables.');
      throw new Error('Authentication configuration is incomplete.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use jwks-rsa to dynamically fetch the signing keys from the OIDC provider.
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuerUrl}/.well-known/jwks.json`,
      }),
      audience: audience,
      issuer: issuerUrl,
      algorithms: ['RS256'], // Standard algorithm used by OIDC providers
    });
    this.logger.log(`JWT Strategy initialized with Issuer: ${issuerUrl}, Audience: ${audience}`);
  }

  /**
   * Validates the decoded JWT payload. This method is called after the token's
   * signature, expiration, issuer, and audience have been verified.
   * @param payload The decoded JWT payload.
   * @returns The user object to be attached to the request (`req.user`).
   */
  async validate(payload: any) {
    if (!payload.sub) {
      this.logger.warn('Received JWT payload without a subject (sub) claim.');
      throw new UnauthorizedException('Invalid token: Subject claim is missing.');
    }
    // The payload itself is a valid user representation in this context.
    return { userId: payload.sub, claims: payload };
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  /**
   * Overrides the default `getRequest` method to extract the request object
   * correctly from the GraphQL execution context.
   * @param context The NestJS execution context.
   * @returns The underlying HTTP request object.
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  /**
   * Optional: Handles failed authentication attempts. If authentication fails,
   * this method is called. By default, it throws an UnauthorizedException.
   */
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error(`Authentication failed: ${err?.message || info?.message || 'Unknown reason'}`);
      throw err || new UnauthorizedException();
    }
    return user;
  }
}

// =============================================================================
// ROOT APPLICATION MODULE
// =============================================================================

/**
 * The root module for the Accounts microservice.
 *
 * This module has been updated to centralize infrastructure configuration (Database, GraphQL,
 * Authentication) and to import domain-specific feature modules. It implements the necessary
 * infrastructure to support the new CQRS/Event Sourcing and Hexagonal Architecture directives,
 * while also enforcing strong authentication for its GraphQL API.
 *
 * Core responsibilities include:
 * 1. Global configuration management (`ConfigModule`).
 * 2. Database connection for the **read model** (`TypeOrmModule`).
 * 3. GraphQL server as a federated subgraph (`GraphQLModule`).
 * 4. Integration with the central message bus (`EventBusModule`).
 * 5. **NEW**: Robust JWT authentication for all GraphQL endpoints (`PassportModule`, `JwtModule`, `JwtStrategy`, `JwtAuthGuard`).
 * 6. Importing the core domain module (`AccountModule`), which internally orchestrates
 *    its command (write-model) and query (read-model/projection) aspects.
 */
@Module({
  imports: [
    // --- Core Infrastructure Modules ---

    // Global configuration module to load environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      cache: true,
    }),

    // Database connection module for the **read model** (PostgreSQL).
    // Configured asynchronously to use ConfigService for dynamic credentials.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // `synchronize` should be `false` in production. Use migrations instead.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // GraphQL module configured for Apollo Federation v2.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Automatically generate the schema file based on resolvers.
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Sort schema lexicographically for consistency in the generated SDL.
        sortSchema: true,
        // Enable playground in non-production environments for easier debugging.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // --- Authentication Modules ---

    // Configures Passport.js for JWT strategy.
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Provides necessary utilities for JWTs, though actual validation is handled by JwtStrategy.
    JwtModule.register({}),

    // --- Feature & Domain Modules ---

    // The core module for this service, now internally refactored for CQRS/Event Sourcing.
    AccountModule,

    // Module for connecting to the event bus (e.g., Kafka) for inter-service communication.
    EventBusModule,
  ],
  providers: [
    // Register the custom JWT strategy for token validation.
    JwtStrategy,
    // Apply the JWT authentication guard globally to protect all GraphQL resolvers by default.
    // This ensures that all incoming GraphQL requests are authenticated.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
