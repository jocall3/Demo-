import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloGatewayDriver,
  ApolloGatewayDriverConfig,
} from '@nestjs/apollo';
import { IntrospectAndCompose } from '@apollo/gateway';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

/**
 * The root module for the API Gateway (formerly BFF).
 *
 * As per the architectural transformation, this module's primary responsibility
 * is to configure and run an Apollo Gateway. It composes the GraphQL schemas
 * from all downstream microservices (subgraphs) into a single, unified supergraph.
 *
 * Business logic modules have been removed, as that logic now resides in the
 * respective microservices.
 */
@Module({
  imports: [
    // --- Core Modules ---

    // Global configuration module to handle environment variables and typed config.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // --- GraphQL Gateway Module ---
    // Asynchronously configures the GraphQL module to act as a gateway.
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      // The factory function injects ConfigService to read subgraph URLs.
      useFactory: (configService: ConfigService) => {
        const subgraphs = configService.get<any[]>('gateway.subgraphs');

        if (!subgraphs || subgraphs.length === 0) {
          throw new Error('Gateway subgraphs are not defined in the configuration.');
        }

        return {
          // The gateway property is specific to the ApolloGatewayDriver.
          gateway: {
            // IntrospectAndCompose dynamically pulls schemas from running subgraphs.
            supergraphSdl: new IntrospectAndCompose({
              subgraphs,
              // In a production environment, you might want to adjust the poll interval
              // for schema updates or use a managed federation setup.
              pollIntervalInMs: 15000,
            }),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  // A simple health check controller remains for infrastructure monitoring (e.g., liveness probes).
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
