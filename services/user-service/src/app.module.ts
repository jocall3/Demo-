import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user.module';

/**
 * The root module for the User microservice.
 *
 * This module is responsible for:
 * 1. Configuring the application's global settings (e.g., environment variables).
 * 2. Setting up the GraphQL server as a federated subgraph.
 * 3. Establishing a connection to the service's dedicated database.
 * 4. Importing the feature modules that contain the business logic for the user domain.
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Assumes a .env file in the service's root directory.
      envFilePath: `.env`,
    }),

    // Database module for connecting to the user service's dedicated database.
    // Per the architectural directive, each microservice owns its own database.
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        // Automatically load entities defined in this microservice.
        autoLoadEntities: true,
        // `synchronize` should be `false` in production. It automatically updates the schema.
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // GraphQL module configured for Apollo Federation.
    GraphQLModule.forRootAsync<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: {
          federation: 2,
          path: join(process.cwd(), 'src/schema.gql'),
        },
        // Sort schema alphabetically to have a predictable schema file.
        sortSchema: true,
        // Enable the GraphQL Playground in non-production environments.
        playground: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),

    // The core feature module for user-related logic.
    UserModule,
  ],
})
export class AppModule {}
