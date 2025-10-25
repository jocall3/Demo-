import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * The DatabaseModule is responsible for configuring and providing the database connection
 * for the User microservice. It uses TypeORM for object-relational mapping.
 *
 * This module follows best practices by using `TypeOrmModule.forRootAsync` to
 * asynchronously configure the database connection using environment variables
 * provided by NestJS's `ConfigService`.
 *
 * The configuration now uses a single `DATABASE_URL` environment variable for
 * streamlined cloud-native deployments and adheres to hexagonal architecture by
 * automatically discovering entities, decoupling them from the infrastructure layer.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // `ConfigModule` needs to be imported here so that `ConfigService` can be injected.
      imports: [ConfigModule],
      inject: [ConfigService],
      // `useFactory` is a function that returns the configuration object.
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // Use a single DATABASE_URL environment variable for streamlined configuration.
        url: configService.get<string>('DATABASE_URL'),

        // `autoLoadEntities: true` automatically discovers any entities registered
        // with `TypeOrmModule.forFeature()` in other modules. This adheres to
        // hexagonal architecture by keeping domain entities decoupled from the
        // infrastructure database module.
        autoLoadEntities: true,

        // `synchronize: true` should ONLY be used in development. It automatically
        // creates the database schema on every application launch. For production,
        // this should be `false`, and migrations should be used instead for safe schema evolution.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',

        // It's good practice to enable logging in development to see the generated SQL.
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
  ],
  // Exporting TypeOrmModule makes TypeORM repositories available for injection
  // in other modules that import this DatabaseModule.
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
