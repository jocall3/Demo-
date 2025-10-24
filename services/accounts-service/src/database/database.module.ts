import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * The DatabaseModule is responsible for configuring and establishing the database connection
 * for the accounts-service.
 *
 * It uses TypeORM, a popular Object-Relational Mapper (ORM) for TypeScript, to interact
 * with a PostgreSQL database. The configuration is loaded asynchronously from environment
 * variables using NestJS's ConfigModule to ensure that credentials and other sensitive
 * information are not hard-coded.
 *
 * This module will be imported into the root AppModule to make the database connection
 * available throughout the service.
 */
@Module({
  imports: [
    // Asynchronously configure the TypeORM module. This allows us to inject the
    // ConfigService to retrieve database credentials from environment variables.
    TypeOrmModule.forRootAsync({
      // We need to import ConfigModule here so that ConfigService is available for injection.
      imports: [ConfigModule],
      // Inject the ConfigService into our factory function.
      inject: [ConfigService],
      // The factory function returns the configuration object for TypeORM.
      useFactory: (configService: ConfigService) => ({
        type: 'postgres', // Specify the database driver.
        host: configService.get<string>('ACCOUNTS_DB_HOST'),
        port: configService.get<number>('ACCOUNTS_DB_PORT'),
        username: configService.get<string>('ACCOUNTS_DB_USER'),
        password: configService.get<string>('ACCOUNTS_DB_PASS'),
        database: configService.get<string>('ACCOUNTS_DB_NAME'),

        // This pattern automatically discovers any files ending in `.entity.ts` or `.entity.js`
        // within the `src` directory, adding them to TypeORM's list of known entities.
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],

        // `synchronize: true` should ONLY be used in development. It automatically
        // updates the database schema to match the entities. For production,
        // migrations should be used to manage schema changes safely.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',

        // Enable logging for database queries in non-production environments for easier debugging.
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
  ],
})
export class DatabaseModule {}
