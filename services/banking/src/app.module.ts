import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';

import { HealthModule } from './health/health.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

/**
 * The root module for the Banking microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings (e.g., environment variables via ConfigModule).
 * 2. Setting up the GraphQL server with Apollo Federation v2. This service will expose a subgraph.
 * 3. Importing all of the feature-specific modules that contain the business logic and GraphQL resolvers
 *    for the banking domain (e.g., AccountsModule, TransactionsModule).
 * 4. Importing modules required for federation, such as the UsersModule which will resolve the User entity.
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // GraphQL module configured for Apollo Federation.
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      // Automatically generate the schema file which will be consumed by the gateway.
      // `federation: 2` enables support for the latest Apollo Federation features.
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'src/schema.gql'),
      },
    }),

    // Health check module for service discovery and monitoring.
    HealthModule,

    // Feature modules for the banking domain.
    AccountsModule,
    TransactionsModule,

    // Module for resolving federated entities (e.g., User from an auth service).
    UsersModule,
  ],
})
export class AppModule {}
