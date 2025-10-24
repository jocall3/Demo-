import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloGatewayDriver,
  ApolloGatewayDriverConfig,
} from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { HttpModule, HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

/**
 * A custom RemoteGraphQLDataSource that implements the OAuth 2.0 Token Exchange flow (RFC 8693).
 *
 * Before forwarding a request to a downstream subgraph, it intercepts the incoming request's
 * Authorization header. It then calls a dedicated Identity Provider to exchange the incoming
 * "subject_token" for a new "access_token" that is specifically scoped (audienced) for the
 * target subgraph. This enhances security by ensuring that tokens are narrowly-scoped and
 * prevents a compromised service from being able to call other services.
 */
class TokenExchangingDataSource extends RemoteGraphQLDataSource {
  private readonly logger = new Logger(TokenExchangingDataSource.name);
  private tokenEndpoint: string;
  private clientId: string;
  private clientSecret: string; // In a production system, this must be retrieved from a secure secrets manager.

  constructor(
    private readonly options: {
      url: string;
      name: string; // The name of the subgraph, used as the 'audience' for the token exchange.
      configService: ConfigService;
      httpService: HttpService;
    },
  ) {
    super({ url: options.url });
    this.tokenEndpoint = this.options.configService.get<string>('auth.tokenEndpoint');
    this.clientId = this.options.configService.get<string>('auth.clientId');
    this.clientSecret = this.options.configService.get<string>('auth.clientSecret');

    if (!this.tokenEndpoint || !this.clientId || !this.clientSecret) {
        this.logger.error('Token Exchange configuration (tokenEndpoint, clientId, clientSecret) is missing.');
        throw new Error('Incomplete authentication configuration for token exchange.');
    }
  }

  /**
   * This method is called before a request is sent to a subgraph.
   * It performs the token exchange if an Authorization header is present.
   */
  async willSendRequest({ request, context }) {
    const { headers } = context;

    if (headers?.authorization) {
      const subjectToken = headers.authorization.replace('Bearer ', '');

      try {
        const exchangedToken = await this.exchangeToken(subjectToken, this.options.name);
        request.http.headers.set('authorization', `Bearer ${exchangedToken}`);
      } catch (error) {
        this.logger.error(`Token exchange failed for audience '${this.options.name}'`, error.stack);
        // Abort the request if token exchange fails.
        throw new Error('Failed to obtain a downstream token. Access denied.');
      }
    }
  }

  /**
   * Performs the OAuth 2.0 Token Exchange request to the Identity Provider.
   * @param subjectToken The incoming access token from the client.
   * @param audience The identifier for the target subgraph service.
   * @returns A new, audience-restricted access token.
   */
  private async exchangeToken(subjectToken: string, audience: string): Promise<string> {
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:token-exchange');
    params.append('subject_token', subjectToken);
    params.append('subject_token_type', 'urn:ietf:params:oauth:token-type:access_token');
    params.append('audience', audience);
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);

    this.logger.debug(`Requesting token exchange for audience: ${audience}`);

    try {
      const { data } = await firstValueFrom(
        this.options.httpService.post(this.tokenEndpoint, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      if (!data.access_token) {
        throw new Error('Token exchange response did not include an access_token.');
      }

      this.logger.debug(`Successfully exchanged token for audience: ${audience}`);
      return data.access_token;
    } catch (error) {
      this.logger.error(`HTTP request to IdP failed during token exchange for audience ${audience}: ${error.message}`);
      // Propagate the error to be handled by willSendRequest.
      throw error;
    }
  }
}

/**
 * The root module for the API Gateway (formerly BFF).
 *
 * This module configures and runs an Apollo Gateway. It composes the GraphQL schemas
 * from all downstream microservices into a single, unified supergraph.
 *
 * It now implements the OAuth 2.0 Token Exchange flow for secure service-to-service
 * communication, deprecating the previous insecure practice of JWT forwarding.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    HttpModule, // Needed for HttpService to make calls to the Identity Provider.
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [HttpModule], // Make HttpService available in the factory.
      useFactory: (configService: ConfigService, httpService: HttpService) => {
        const subgraphs = configService.get<any[]>('gateway.subgraphs');

        if (!subgraphs || subgraphs.length === 0) {
          throw new Error('Gateway subgraphs are not defined in the configuration.');
        }

        return {
          server: {
            // Forward the incoming request context (containing headers) to the data source.
            context: ({ req }) => ({
              headers: req.headers,
            }),
          },
          gateway: {
            supergraphSdl: new IntrospectAndCompose({
              subgraphs,
            }),
            // Use the custom buildService function to implement token exchange.
            buildService({ name, url }) {
              return new TokenExchangingDataSource({
                name,
                url,
                configService,
                httpService,
              });
            },
          },
        };
      },
      inject: [ConfigService, HttpService], // Inject necessary services into the factory.
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
