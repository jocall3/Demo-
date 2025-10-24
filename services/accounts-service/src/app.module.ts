import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { join } from 'path';

import { AccountsModule } from './accounts/accounts.module';
import { PlaidModule } from './plaid/plaid.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

/**
 * The root module for the Accounts microservice.
 *
 * This module orchestrates the entire service by:
 * 1.  Setting up global configuration management (ConfigModule).
 * 2.  Establishing the database connection (TypeOrmModule).
 * 3.  Configuring the GraphQL server as a federated subgraph (GraphQLModule).
 * 4.  Importing all domain-specific feature modules (AccountsModule, PlaidModule).
 * 5.  Importing modules required for federation (UsersModule) and health checks (HealthModule).
 */
@Module({
  imports: [
    // --- Core Infrastructure Modules ---

    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      // In production, consider using a more sophisticated config strategy
      // like loading from a different file or a config service.
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // Database connection module. Configured asynchronously to use ConfigService.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        // Automatically load all entities registered by feature modules.
        autoLoadEntities: true,
        // `synchronize` should be `false` in production. Use migrations instead.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // GraphQL module configured for Apollo Federation v2.
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      // Automatically generate the schema file based on resolvers.
      // The `federation: 2` option is crucial for compatibility with the latest gateway.
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'src/schema.gql'),
      },
    }),

    // --- Feature & Domain Modules ---

    // Health check module for Kubernetes liveness/readiness probes.
    HealthModule,

    // The core module for this service, handling account-related logic.
    AccountsModule,

    // Module for interacting with the Plaid API to fetch account data.
    PlaidModule,

    // Module for resolving federated entities (e.g., extending the User entity).
    UsersModule,
  ],
})
export class AppModule {}
