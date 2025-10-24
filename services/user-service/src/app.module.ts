import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { EventBusModule } from './event-bus/event-bus.module';

/**
 * The root module for the User microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings (e.g., environment variables via ConfigModule).
 * 2. Setting up the GraphQL server as a federated subgraph. This service owns the `User` entity.
 * 3. Establishing a connection to the service's dedicated database.
 * 4. Integrating the message bus for event-driven communication.
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // GraphQL module configured for Apollo Federation.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (configService: ConfigService) => ({
        // Automatically generate the schema file.
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Sort schema alphabetically for consistent schema generation.
        sortSchema: true,
        // Enable the GraphQL playground in non-production environments.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // Infrastructure Modules
    DatabaseModule,
    EventBusModule,

    // Feature Module
    UserModule,
  ],
})
export class AppModule {}
