import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';

import { DatabaseModule } from './database/database.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { TransactionModule } from './transaction/transaction.module';

/**
 * The root module for the Transactions microservice.
 *
 * This module orchestrates the service by:
 * 1.  Setting up global configuration management (ConfigModule).
 * 2.  Configuring the GraphQL server as a federated subgraph (GraphQLModule).
 * 3.  Importing the module for database connectivity (DatabaseModule).
 * 4.  Importing the module for message bus connectivity (EventBusModule).
 * 5.  Importing the core domain feature module (TransactionModule).
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      // In production, this could be extended to load secrets from a vault.
      envFilePath: `.env`, // Specify env file if needed
    }),

    // GraphQL module configured for Apollo Federation v2.
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      // Automatically generate the schema file based on resolvers.
      // The `federation: 2` option is crucial for compatibility.
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'src/schema.gql'),
      },
      sortSchema: true,
    }),

    // Module for establishing database connection (e.g., via TypeORM/Mongoose).
    DatabaseModule,

    // Module for connecting to the event bus (e.g., Kafka) for inter-service communication.
    EventBusModule,

    // The core feature module for this service, handling transaction logic.
    TransactionModule,
  ],
})
export class AppModule {}
