import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';

import { GenaiModule } from './genai/genai.module';
import configuration from './config/configuration';

/**
 * The root module for the GenAI microservice.
 *
 * This module configures the application's global settings, sets up the
 * GraphQL server as an Apollo Federation v2 subgraph, and imports the
 * feature-specific GenaiModule.
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables and typed config.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),

    // GraphQL module configured for Apollo Federation.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (configService: ConfigService) => ({
        // Automatically generate the schema file.
        // `federation: 2` enables support for the latest Apollo Federation features.
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Sort schema lexicographically.
        sortSchema: true,
        // Enable the GraphQL playground in non-production environments for easier debugging.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // The feature module containing all GenAI-related resolvers and services.
    GenaiModule,
  ],
})
export class AppModule {}
