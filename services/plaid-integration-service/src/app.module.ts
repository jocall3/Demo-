import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { join } from 'path';

import { PlaidModule } from './plaid/plaid.module';
import { EventBusModule } from './event-bus/event-bus.module';

/**
 * The root module for the Plaid Integration microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings via ConfigModule for environment variables.
 * 2. Setting up the GraphQL server with Apollo Federation v2, exposing this service as a subgraph.
 * 3. Configuring the connection to the event bus (Kafka) for asynchronous, event-driven communication.
 * 4. Importing the core feature module, `PlaidModule`, which contains all business logic,
 *    GraphQL resolvers, and event handlers related to Plaid integration.
 */
@Module({
  imports: [
    // Global configuration module for handling environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Specifies the .env file for this specific microservice.
      envFilePath: `.env`,
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

    // The event bus module for Kafka integration.
    EventBusModule,

    // The core feature module for this service.
    PlaidModule,
  ],
})
export class AppModule {}
