import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { join } from 'path';
import { BankingModule } from './banking.module';

/**
 * The root module for the Banking microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings (e.g., environment variables via ConfigModule).
 * 2. Setting up the GraphQL server with Apollo Federation v2. This service will expose a subgraph.
 * 3. Importing the primary feature module for the banking domain (`BankingModule`).
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
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

    // The primary feature module for this service.
    BankingModule,
  ],
})
export class AppModule {}
