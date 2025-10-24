import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

// --- Feature Modules ---
import { AuthModule } from './auth/auth.module';
import { IdentityService } from './auth/identity.service';

// --- Observability & Health ---
import { MetricsModule } from './modules/metrics/metrics.module';

/**
 * The root module for the API Gateway.
 *
 * ARCHITECTURAL REFACTOR:
 * This module now implements a sophisticated security model based on OAuth 2.0 Token Exchange (RFC 8693).
 * It no longer validates client JWTs directly; that is the responsibility of an upstream API Security Gateway.
 *
 * Core responsibilities:
 * 1.  Receive a validated client token from the upstream gateway.
 * 2.  For each request to a downstream subgraph, exchange the client token for a new, audience-restricted
 *     token from a central Identity Provider (e.g., Auth0, Keycloak).
 * 3.  Forward the new, scoped token to the appropriate subgraph, ensuring zero-trust security.
 * 4.  Compose the subgraphs into a single supergraph.
 * 5.  Handle cross-cutting concerns like observability (metrics) and health checks.
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),

    // Module responsible for Identity Provider interactions (e.g., token exchange).
    AuthModule,

    // --- GraphQL Gateway Module ---
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [AuthModule], // Make IdentityService available for injection.
      useFactory: (
        configService: ConfigService,
        identityService: IdentityService,
      ) => ({
        // The `server` property configures the underlying Apollo Server.
        // We use it to extract the client token from incoming request headers.
        server: {
          context: ({ req }) => {
            // The upstream API Security Gateway is responsible for JWT validation.
            // We extract the token here to make it available for the token exchange flow.
            const token = req.headers.authorization?.replace('Bearer ', '');
            return {
              token, // The original token from the client.
              headers: req.headers, // Forward other headers like trace IDs.
            };
          },
        },
        // The `gateway` configuration is the core of the Apollo Gateway setup.
        gateway: {
          supergraphSdl: new IntrospectAndCompose({
            subgraphs: configService.get<any[]>('gateway.subgraphs'),
          }),
          // buildService customizes how the gateway communicates with each subgraph.
          // This is where we implement the Token Exchange security pattern.
          buildService({ name, url }) {
            return new RemoteGraphQLDataSource({
              url,
              async willSendRequest({ request, context }) {
                // Forward essential observability headers.
                if (context.headers) {
                  for (const key of [
                    'x-request-id',
                    'x-b3-traceid',
                    'x-b3-spanid',
                    'x-b3-parentspanid',
                    'x-b3-sampled',
                  ]) {
                    if (context.headers[key]) {
                      request.http?.headers.set(key, context.headers[key]);
                    }
                  }
                }

                // Find the configured audience for the target subgraph.
                const subgraph = configService
                  .get<any[]>('gateway.subgraphs')
                  .find((s) => s.name === name);

                if (context.token && subgraph?.audience) {
                  try {
                    // Perform Token Exchange to get a new, audience-restricted token.
                    const exchangedToken = await identityService.exchangeToken(
                      context.token,
                      subgraph.audience,
                    );
                    request.http?.headers.set(
                      'authorization',
                      `Bearer ${exchangedToken}`,
                    );
                  } catch (error) {
                    // It is crucial to handle token exchange failures.
                    // We log the error and proceed without an auth header. The subgraph should reject unauthorized requests.
                    Logger.error(
                      `Token exchange failed for subgraph '${name}'. Request will be unauthenticated. Error: ${error.message}`,
                      'GatewayDataSource',
                    );
                  }
                }
              },
            });
          },
        },
      }),
      inject: [ConfigService, IdentityService],
    }),

    // Observability & Health
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
