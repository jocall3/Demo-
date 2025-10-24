import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { AIAgentModule } from './ai-agent/ai-agent.module';

/**
 * The root module for the AI Agent microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings (e.g., environment variables via ConfigModule).
 * 2. Setting up the GraphQL server with Apollo Federation v2. This service will expose a subgraph
 *    dedicated to AI agent functionality, such as conversational AI, tool use, and long-running tasks.
 * 3. Importing the core feature module, `AIAgentModule`, which contains the business logic and
 *    GraphQL resolvers for the AI Agent domain.
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      // In a microservice, it's good practice to allow for service-specific env files.
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
    AIAgentModule,
  ],
})
export class AppModule {}
