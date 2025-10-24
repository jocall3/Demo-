import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';

/**
 * The DatabaseModule is responsible for configuring and providing the database connection
 * for the User microservice. It uses TypeORM for object-relational mapping.
 *
 * This module follows best practices by using `TypeOrmModule.forRootAsync` to
 * asynchronously configure the database connection using environment variables
 * provided by NestJS's `ConfigService`.
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
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),

        // This array lists all the entities that TypeORM should be aware of.
        // For now, this service owns the User entity.
        entities: [User],

        // `autoLoadEntities: true` is a NestJS-specific option that allows
        // TypeORM to automatically discover entities defined in modules that are registered
        // with `forFeature`.
        autoLoadEntities: true,

        // `synchronize: true` should ONLY be used in development. It automatically
        // creates the database schema on every application launch. For production,
        // this should be `false`, and migrations should be used instead.
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
