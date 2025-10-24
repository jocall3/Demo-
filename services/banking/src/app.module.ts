import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
      cache: true,
    }),

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
        // Sort the schema alphabetically for consistent schema generation.
        sortSchema: true,
        // Enable the GraphQL playground/sandbox UI only in non-production environments.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // The primary feature module for this service.
    BankingModule,
  ],
})
export class AppModule {}
