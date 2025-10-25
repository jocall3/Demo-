import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';

// This is the feature module that will contain the core logic for this service.
// It will house the Kafka consumer, the projection service logic, and the GraphQL resolver.
import { ProjectionModule } from './projection/projection.module';

/**
 * The root module for the Accounts Projection Service.
 *
 * ARCHITECTURAL OVERVIEW:
 * This service is a core component of the CQRS and Event Sourcing pattern for the Accounts domain.
 * Its sole responsibility is to build and serve the "read model" (projection) of account data.
 *
 * Core responsibilities:
 * 1.  Connect to the central message bus (Kafka) to consume domain events related to accounts
 *     (e.g., 'account.created', 'account.debited', 'account.credited').
 * 2.  Process these events to build and maintain a denormalized, query-optimized representation
 *     of account data in a separate read database (MongoDB).
 * 3.  Expose this read model via a federated GraphQL subgraph, allowing other services and the
 *     API Gateway to perform efficient queries for account information.
 *
 * This module sets up the foundational infrastructure for the service:
 * - `ConfigModule`: For loading environment variables.
 * - `MongooseModule`: For connecting to the MongoDB read database.
 * - `GraphQLModule`: To configure the Apollo Federation subgraph for serving queries.
 * - `ProjectionModule`: The feature module containing the application logic.
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

    // Database connection for the MongoDB read model.
    // Configured asynchronously to use ConfigService for the connection URI.
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');
        if (!mongoUri) {
          throw new Error('MONGODB_URI environment variable is not configured.');
        }
        return {
          uri: mongoUri,
          dbName: configService.get<string>(
            'MONGODB_DB_NAME',
            'accounts_projection',
          ),
        };
      },
      inject: [ConfigService],
    }),

    // GraphQL module configured for Apollo Federation v2.
    // This service exposes the read-side of the Account entity.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (configService: ConfigService) => ({
        // Automatically generate the schema file based on resolvers.
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        sortSchema: true,
        // The read-side is typically query-only, so playground is useful for testing.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // --- Feature Module ---

    // The core module containing the projection logic, Kafka consumer, and GraphQL resolvers.
    ProjectionModule,
  ],
})
export class AppModule {}
