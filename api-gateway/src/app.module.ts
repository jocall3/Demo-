import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

// Observability Modules
import { MetricsModule } from './modules/metrics/metrics.module';

/**
 * The root module for the API Gateway.
 *
 * This module is responsible for:
 * 1. Setting up global configuration management.
 * 2. Configuring the Apollo Gateway to introspect and compose the various
 *    microservice subgraphs into a single, unified Supergraph.
 * 3. Handling cross-cutting concerns like observability (metrics) and health checks.
 * 4. Removing all domain-specific business logic, which has been migrated to
 *    dedicated microservices (e.g., Banking, GenAI).
 */
@Module({
  imports: [
    // --- Core Modules ---

    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),

    // --- GraphQL Gateway Module ---
    // Sets up the GraphQL server as a federated gateway.
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      useFactory: (configService: ConfigService) => ({
        // The `server` property allows us to configure the underlying Apollo Server,
        // for example, to pass context to the gateway.
        server: {
          context: ({ req }) => ({
            headers: req.headers,
          }),
        },
        // The `gateway` configuration is the core of the API Gateway setup.
        gateway: {
          // `supergraphSdl` tells the gateway how to obtain the supergraph schema.
          // `IntrospectAndCompose` will query all subgraphs to compose the schema on startup.
          supergraphSdl: new IntrospectAndCompose({
            subgraphs: configService.get('gateway.subgraphs'),
            // In production, you might want to add a pollInterval to refresh the schema periodically.
            // pollIntervalInMs: 10000,
          }),
          // The `buildService` function allows us to customize how the gateway communicates
          // with each subgraph. This is crucial for adding authentication headers.
          buildService({ url }) {
            return new RemoteGraphQLDataSource({
              url,
              willSendRequest({ request, context }) {
                // Forward specific headers from the original client request to the subgraph.
                // This is how authentication tokens (e.g., JWTs) are passed down.
                if (context.headers?.authorization) {
                  request.http.headers.set(
                    'authorization',
                    context.headers.authorization,
                  );
                }

                // Add a shared API key for secure inter-service communication between
                // the gateway and the subgraphs.
                const subgraphApiKey = configService.get<string>(
                  'gateway.subgraphApiKey',
                );
                if (subgraphApiKey) {
                  request.http.headers.set('x-api-key', subgraphApiKey);
                }
              },
            });
          },
        },
      }),
      inject: [ConfigService],
    }),

    // --- Observability & Health ---
    MetricsModule, // Provides custom metrics for the gateway itself.
  ],
  // The AppController provides a root-level health check endpoint (e.g., /health).
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
