import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectionModule } from './projection/projection.module';

/**
 * @module AppModule
 * @description The root module for the Transactions Projection Service.
 *
 * This service is a critical component of the CQRS and Event Sourcing pattern implemented
 * for the core financial microservices. Its sole responsibility is to act as an asynchronous
 * consumer of domain events emitted by the `transactions-service`.
 *
 * It subscribes to Kafka topics where transaction events (e.g., `TransactionCreated`, `TransactionUpdated`)
 * are published. Upon receiving an event, it processes the data and updates a denormalized
 * read model in a separate database (MongoDB), which is optimized for fast queries.
 *
 * This strict separation of concerns ensures that the write model (`transactions-service`) remains
 * focused on processing commands and maintaining consistency, while this service provides a highly
 * available and performant read model for queries from the API Gateway or other services.
 *
 * Core responsibilities:
 * 1.  Global configuration management (`ConfigModule`).
 * 2.  Connection to the read model database (MongoDB) via `MongooseModule`.
 * 3.  Importing the core `ProjectionModule` which contains the Kafka consumers and database logic.
 */
@Module({
  imports: [
    // Global configuration module to load environment variables from a .env file.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // Asynchronously configure the Mongoose (MongoDB) connection.
    // This allows us to use the ConfigService to fetch the database connection string
    // from environment variables, avoiding hardcoded credentials.
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
        dbName: configService.get<string>(
          'MONGODB_DB_NAME',
          'transactions_read_db',
        ),
      }),
      inject: [ConfigService],
    }),

    // Import the primary feature module that contains the Kafka consumers
    // and the logic for building the read model projections.
    ProjectionModule,
  ],
})
export class AppModule {}
