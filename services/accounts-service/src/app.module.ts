import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { AccountModule } from './account/account.module';
import { EventBusModule } from './event-bus/event-bus.module';

/**
 * The root module for the Accounts microservice.
 *
 * This module has been updated to centralize infrastructure configuration (Database, GraphQL)
 * and import domain-specific feature modules. This pattern improves clarity and aligns
 * with best practices for building scalable NestJS microservices.
 *
 * It orchestrates the entire service by:
 * 1.  Setting up global configuration management (ConfigModule).
 * 2.  Establishing the database connection (TypeOrmModule), absorbing the previous DatabaseModule.
 * 3.  Configuring the GraphQL server as a federated subgraph (GraphQLModule).
 * 4.  Importing the domain-specific feature module (AccountModule).
 * 5.  Importing the event bus module for inter-service communication (EventBusModule).
 */
@Module({
  imports: [
    // --- Core Infrastructure Modules ---

    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      // In production, consider a more robust config strategy.
      envFilePath: `.env`,
      cache: true,
    }),

    // Database connection module, configured asynchronously to use ConfigService.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        // Automatically load all entities registered by feature modules via forFeature().
        autoLoadEntities: true,
        // `synchronize` should be `false` in production. Use migrations instead.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // GraphQL module configured for Apollo Federation v2.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Automatically generate the schema file based on resolvers.
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Sort schema lexicographically for consistency.
        sortSchema: true,
        // Enable playground in non-production environments for easier debugging.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // --- Feature & Domain Modules ---

    // The core module for this service, handling account-related logic.
    AccountModule,

    // Module for connecting to the event bus (e.g., Kafka) for inter-service communication.
    EventBusModule,
  ],
})
export class AppModule {}
