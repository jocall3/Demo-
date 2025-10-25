import { join } from 'path';
import { Module, Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
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

import { PlaidModule } from './plaid/plaid.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { PlaidItem } from './plaid/entities/plaid-item.entity'; // Assuming this entity exists

// =============================================================================
// INLINE AUTHENTICATION COMPONENTS
// =============================================================================
// These components implement JWT validation based on an OIDC-compliant Identity Provider
// using a JWKS (JSON Web Key Set) endpoint to fetch public keys for signature verification.

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const authConfig = {
      issuerUrl: configService.get<string>('OIDC_ISSUER_URL'),
      audience: configService.get<string>('OIDC_AUDIENCE'),
    };

    if (!authConfig.issuerUrl || !authConfig.audience) {
      throw new Error(
        'Auth configuration (OIDC_ISSUER_URL, OIDC_AUDIENCE) is missing from environment variables.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authConfig.issuerUrl}/.well-known/jwks.json`,
      }),
      audience: authConfig.audience,
      issuer: authConfig.issuerUrl,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: any) {
    if (!payload.sub) {
      throw new UnauthorizedException(
        'Invalid token: Subject (sub) claim is missing.',
      );
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

/**
 * The root module for the Plaid Integration microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings via ConfigModule for environment variables.
 * 2. Setting up the GraphQL server with Apollo Federation v2, exposing this service as a subgraph.
 * 3. Configuring the database connection using TypeORM.
 * 4. Implementing secure JWT authentication for its GraphQL API.
 * 5. Configuring the connection to the event bus (Kafka) for asynchronous, event-driven communication.
 * 6. Importing the core feature module, `PlaidModule`, which contains all business logic,
 *    GraphQL resolvers, and event handlers related to Plaid integration.
 */
@Module({
  imports: [
    // Global configuration module for handling environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `.env`,
    }),

    // Database connection module (PostgreSQL via TypeORM).
    // Configured asynchronously to use ConfigService for credentials.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // For entities defined in feature modules, they will be auto-loaded.
        // Ensure PlaidItem entity is registered via `TypeOrmModule.forFeature()` in PlaidModule.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // Passport and JWT modules for authentication.
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // No secret needed here; handled by jwksRsa in JwtStrategy

    // GraphQL module configured for Apollo Federation.
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'src/schema.gql'),
      },
      sortSchema: true,
      playground: true,
    }),

    // The event bus module for Kafka integration.
    EventBusModule,

    // The core feature module for this service.
    PlaidModule,
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
