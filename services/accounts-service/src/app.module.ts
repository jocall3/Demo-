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
import { AuthGuard } from '@nestjs/passport';
import * as jwksRsa from 'jwks-rsa';

import { AccountModule } from './application/account.module';
import { EventBusModule } from './infrastructure/adapters/event-bus/event-bus.module';

// =============================================================================
// INLINE AUTHENTICATION COMPONENTS (ADAPTERS)
// =============================================================================
// As per the new security architecture, this service must validate incoming JWTs
// against the central OIDC provider (e.g., Keycloak). This is implemented
// using Passport.js with a JWKS (JSON Web Key Set) client.

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const issuerUrl = configService.get<string>('OIDC_ISSUER_URL');
    const audience = configService.get<string>('OIDC_AUDIENCE');

    if (!issuerUrl || !audience) {
      this.logger.error('OIDC configuration (OIDC_ISSUER_URL, OIDC_AUDIENCE) is missing. Authentication will fail.');
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

  /**
   * Validates the decoded JWT payload after its signature and claims are verified.
   * @param payload The decoded JWT payload.
   * @returns The user object to be attached to the request context.
   */
  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: Subject (sub) claim is missing.');
    }
    return { userId: payload.sub, claims: payload };
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  /**
   * Extracts the request object from the GraphQL execution context.
   */
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error(`Authentication failed: ${err?.message || info?.message}`);
      throw err || new UnauthorizedException('Could not authenticate with token.');
    }
    return user;
  }
}

// =============================================================================
// ROOT APPLICATION MODULE
// =============================================================================

/**
 * The root module for the Accounts microservice, refactored to align with CQRS,
 * Event Sourcing, and Hexagonal Architecture principles.
 *
 * This module is the composition root, responsible for wiring together infrastructure adapters
 * (Database, GraphQL, Auth, Event Bus) with the application's core logic contained in `AccountModule`.
 */
@Module({
  imports: [
    // --- Core Infrastructure Modules ---

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      cache: true,
    }),

    // Database connection for the READ MODEL (Projections).
    // The write model is event-sourced and does not directly use a relational DB for state.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'), // Sourced from Vault in production
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // GraphQL module as a federated subgraph.
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

    // --- Authentication Modules (Adapter) ---
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),

    // --- Feature & Domain Modules ---

    // The core module for this service, now internally refactored for CQRS.
    // Path updated to reflect hexagonal structure: `src/application/account.module.ts`
    AccountModule,

    // Event Bus for Kafka integration (Adapter).
    EventBusModule,
  ],
  providers: [
    // --- Authentication Providers (Adapter) ---
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
