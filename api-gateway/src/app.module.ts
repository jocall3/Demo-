import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import configuration from './config/configuration';

/**
 * The root module for the API Gateway.
 *
 * ARCHITECTURAL REFACTOR:
 * This module configures an Apollo Gateway to compose multiple downstream GraphQL subgraphs.
 * Its security model has been simplified in alignment with the introduction of a Service Mesh.
 *
 * Core responsibilities:
 * 1.  Compose all backend microservice subgraphs into a single supergraph.
 * 2.  Forward incoming requests to the appropriate subgraph(s).
 * 3.  Inject a shared secret (`x-subgraph-api-key`) into requests to subgraphs for application-level authentication.
 *     This complements the service-to-service mTLS provided by the service mesh.
 * 4.  Propagate headers from the original request (including the end-user's `Authorization` token and any
 *     tracing headers) to the downstream services.
 */
@Module({
  imports: [
    // Global configuration module to handle environment variables.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),

    // GraphQL Gateway Module
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [ConfigModule], // Make ConfigService available in the factory.
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('ApolloGateway');
        return {
          // The `server` property configures the underlying Apollo Server.
          server: {
            context: ({ req }) => {
              // Pass all incoming request headers to the context.
              // The `buildService` function will then forward these to the subgraphs.
              return { headers: req.headers };
            },
          },
          // The `gateway` configuration is the core of the Apollo Gateway setup.
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs: configService.get<any[]>('config.gateway.subgraphs'),
            }),
            // `buildService` customizes how the gateway communicates with each subgraph.
            buildService({ url }) {
              return new RemoteGraphQLDataSource({
                url,
                willSendRequest({ request, context }) {
                  const { headers } = context;

                  // Forward all headers from the incoming request. This is crucial for propagating
                  // the end-user's authorization token and tracing context headers.
                  if (headers) {
                    for (const key in headers) {
                      if (headers[key]) {
                        request.http?.headers.set(key, headers[key]);
                      }
                    }
                  }

                  // Add the shared API key for service-to-service authentication.
                  // This complements the network-level mTLS provided by the service mesh.
                  const subgraphApiKey = configService.get<string>('SUBGRAPH_API_KEY');
                  if (subgraphApiKey) {
                    request.http?.headers.set('x-subgraph-api-key', subgraphApiKey);
                  } else {
                    logger.warn(
                      'SUBGRAPH_API_KEY is not configured. Requests to subgraphs will not be authenticated at the application layer.',
                    );
                  }
                },
              });
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
