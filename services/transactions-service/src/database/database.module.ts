import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * The DatabaseModule is responsible for configuring and establishing the connection
 * to the database for the Transactions microservice.
 *
 * It uses TypeORM, a popular Object-Relational Mapper (ORM), and configures it
 * asynchronously (`forRootAsync`) to allow the use of the ConfigService.
 * This approach ensures that database credentials and settings are loaded from
 * environment variables, which is a best practice for security and portability,
 * especially in a containerized, microservices architecture.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // Import ConfigModule to make ConfigService available for injection.
      imports: [ConfigModule],
      // Inject the ConfigService into the factory function.
      inject: [ConfigService],
      // The factory function that returns the TypeORM configuration object.
      useFactory: (configService: ConfigService) => ({
        // Specify the database type. PostgreSQL is a robust choice for transactional data.
        type: 'postgres',
        // Load connection parameters from environment variables via ConfigService.
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        // Automatically load all entities registered with `forFeature` in other modules.
        autoLoadEntities: true,
        // `synchronize` should be `true` only in development to automatically create
        // database schema from entities. In production, this should be `false`,
        // and migrations should be used for schema changes.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        // Enable logging for debugging purposes in non-production environments.
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
  ],
  // Export TypeOrmModule to make repositories available for injection in other modules
  // that import this DatabaseModule.
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
