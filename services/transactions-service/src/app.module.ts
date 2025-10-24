import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

import { TransactionModule } from './transaction/transaction.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { WorkflowModule } from './workflow/workflow.module';

/**
 * The root module for the Transactions microservice.
 *
 * This module has been updated to centralize infrastructure configuration (Database, GraphQL)
 * and to integrate with the new workflow orchestration engine.
 *
 * It orchestrates the entire service by:
 * 1.  Setting up global configuration management (ConfigModule).
 * 2.  Establishing the database connection (TypeOrmModule) using environment variables.
 * 3.  Configuring the GraphQL server as a federated subgraph (GraphQLModule).
 * 4.  Importing the module for message bus connectivity (EventBusModule).
 * 5.  Importing the new WorkflowModule to connect to the orchestration engine (e.g., Temporal).
 * 6.  Importing the core domain feature module (TransactionModule).
 */
@Module({
  imports: [
    // --- Core Infrastructure Modules ---

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      cache: true,
    }),

    // Database connection module (PostgreSQL via TypeORM).
    // Configured asynchronously to use ConfigService for credentials.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        // Auto-loads entities defined via forFeature() in other modules.
        autoLoadEntities: true,
        // In production, use migrations instead of synchronize.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // GraphQL module configured for Apollo Federation v2.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        sortSchema: true,
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // --- Feature & Domain Modules ---

    // The core module for this service, handling transaction logic.
    TransactionModule,

    // Module for connecting to the event bus (e.g., Kafka).
    EventBusModule,

    // NEW: Module to connect to the workflow orchestration engine (e.g., Temporal)
    // and register workers/activities for handling asynchronous sagas.
    WorkflowModule,
  ],
})
export class AppModule {}
