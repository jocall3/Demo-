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

import { TransactionModule } from './transaction/transaction.module';
import { DatabaseModule } from './database/database.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { TemporalModule } from './temporal/temporal.module';

// =============================================================================
// INLINE AUTHENTICATION COMPONENTS
// Implements OIDC-compliant JWT validation for securing the subgraph API.
// =============================================================================

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const issuerUrl = configService.get<string>('OIDC_ISSUER_URL');
    const audience = configService.get<string>('OIDC_AUDIENCE');

    if (!issuerUrl || !audience) {
      this.logger.error('OIDC configuration (OIDC_ISSUER_URL, OIDC_AUDIENCE) is missing.');
      throw new Error('Authentication configuration is incomplete.');
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
      algorithms: ['RS256'],
    });
    this.logger.log(`JWT Strategy initialized with Issuer: ${issuerUrl}, Audience: ${audience}`);
  }

  async validate(payload: any) {
    if (!payload.sub) {
      this.logger.warn('JWT payload is missing a subject (sub) claim.');
      throw new UnauthorizedException('Invalid token: Subject claim is missing.');
    }
    return { userId: payload.sub, claims: payload };
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}

// =============================================================================
// ROOT APPLICATION MODULE
// =============================================================================

/**
 * The root module for the Transactions microservice.
 *
 * This module centralizes infrastructure configuration for CQRS/Event Sourcing,
 * Hexagonal Architecture, and the Durable Saga pattern with Temporal.
 *
 * Core responsibilities:
 * 1. Global configuration management (`ConfigModule`).
 * 2. Database connection for the **read model** (`DatabaseModule` -> MongoDB). The event store is Kafka.
 * 3. GraphQL server as a federated subgraph (`GraphQLModule`).
 * 4. Connection to the event bus/store (`EventBusModule`).
 * 5. Connection to the workflow engine (`TemporalModule`).
 * 6. Robust JWT authentication for all GraphQL endpoints (`PassportModule`, `JwtModule`, `JwtStrategy`, `JwtAuthGuard`).
 * 7. Importing the core `TransactionModule`, which orchestrates the command, query, and workflow logic.
 */
@Module({
  imports: [
    // --- Core Infrastructure Modules ---

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      cache: true,
    }),

    // --- Authentication Modules ---
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),

    // --- GraphQL Federation Module ---
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        sortSchema: true,
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // --- Feature & Domain Modules ---
    TransactionModule,
    DatabaseModule,
    EventBusModule,
    TemporalModule,
  ],
  providers: [
    // Register the custom JWT strategy for OIDC token validation.
    JwtStrategy,
    // Apply the JWT authentication guard globally to protect all GraphQL resolvers.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
