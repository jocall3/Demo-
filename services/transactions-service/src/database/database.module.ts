import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

/**
 * The DatabaseModule is responsible for configuring and establishing connections
 * to both the relational (PostgreSQL) and NoSQL (MongoDB) databases for the
 * Transactions microservice.
 *
 * This dual-database setup supports the CQRS and Event Sourcing architectural
 * directives:
 * - PostgreSQL is typically used for the command-side (aggregates, if not fully
 *   event-sourced in memory) or for metadata related to the event store.
 * - MongoDB is used for the denormalized 'read model' (projections) of transactions,
 *   enabling efficient querying for GraphQL APIs.
 *
 * Both database connections are configured asynchronously using NestJS's ConfigService
 * to load credentials and settings from environment variables, ensuring secure
 * and portable deployment.
 */
@Module({
  imports: [
    // Configuration for the PostgreSQL database (e.g., for command-side aggregates or event store metadata)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') !== 'production' ? ['query', 'error'] : false,
      }),
    }),
    
    // Configuration for the MongoDB database (for the denormalized read model of transactions)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI', 'mongodb://localhost:27017'),
        dbName: configService.get<string>('MONGODB_DATABASE', 'transactions_read_model'),
      }),
    }),
  ],
  // Export both TypeOrmModule and MongooseModule so that other feature modules
  // can use `TypeOrmModule.forFeature()` and `MongooseModule.forFeature()`
  // without needing to re-configure the root connection.
  exports: [TypeOrmModule, MongooseModule],
})
export class DatabaseModule {}
