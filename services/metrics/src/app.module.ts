import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MetricsModule } from './metrics.module';

/**
 * The root module for the Metrics microservice.
 *
 * This module configures the application as a GraphQL subgraph within the
 * Apollo Federation. It sets up global configuration and imports the
 * feature module (`MetricsModule`) responsible for handling all metrics-related
 * business logic and GraphQL resolvers.
 */
@Module({
  imports: [
    // Global configuration module to load and provide environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      // In a production setup, consider using a schema for env validation (e.g., with Joi).
    }),

    // GraphQL module configured to run as a federated subgraph.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (configService: ConfigService) => ({
        // Automatically generate the schema file based on resolvers and object types.
        // `federation: 2` enables support for the latest Apollo Federation features.
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Sort the schema alphabetically for consistent schema generation.
        sortSchema: true,
        // Enable the GraphQL Playground/Sandbox UI only in non-production environments.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      // Inject ConfigService to use it in the factory function.
      inject: [ConfigService],
    }),

    // Import the primary feature module for this service.
    MetricsModule,
  ],
})
export class AppModule {}
