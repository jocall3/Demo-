import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { HttpModule, HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';
import configuration from './config/configuration';

/**
 * @class TokenExchangingDataSource
 * @extends RemoteGraphQLDataSource
 * @description A custom data source for Apollo Gateway that implements the OAuth 2.0 Token Exchange flow (RFC 8693).
 * It intercepts outgoing requests to subgraphs, exchanges the incoming user token for a new, narrowly-scoped
 * token with an audience specific to the target subgraph, and forwards the request with the new token.
 * This enhances security by adhering to the principle of least privilege for service-to-service communication.
 */
class TokenExchangingDataSource extends RemoteGraphQLDataSource {
  private readonly logger = new Logger(TokenExchangingDataSource.name);
  private tokenEndpoint: string;
  private clientId: string;
  private clientSecret: string; // This secret is fetched from Vault at startup and provided by ConfigService.

  constructor(
    private readonly options: {
      url: string;
      name: string; // The name of the subgraph, used as the 'audience' for the token exchange.
      configService: ConfigService;
      httpService: HttpService;
    },
  ) {
    super({ url: options.url });

    const issuer = this.options.configService.get<string>('config.auth.issuer');
    // Construct the token endpoint URL from the issuer URL (common OIDC pattern).
    this.tokenEndpoint = `${issuer}/protocol/openid-connect/token`;
    this.clientId = this.options.configService.get<string>('config.identity.clientId');
    // In a real scenario, this secret would be fetched from Vault and injected by the ConfigService.
    this.clientSecret = this.options.configService.get<string>('OIDC_CLIENT_SECRET');

    if (!this.tokenEndpoint || !this.clientId || !this.clientSecret) {
      this.logger.error(
        'Token Exchange configuration is missing. Ensure OIDC_ISSUER_URL, GATEWAY_CLIENT_ID, and OIDC_CLIENT_SECRET are configured.',
      );
      throw new Error('Incomplete authentication configuration for token exchange.');
    }
  }

  /**
   * Intercepts the request before it's sent to the subgraph to perform the token exchange.
   * @param {object} params - The request parameters.
   * @param {object} params.request - The outgoing GraphQL request.
   * @param {object} params.context - The GraphQL context, containing headers from the original request.
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
        // Abort the request if token exchange fails to prevent unauthorized/unscoped access.
        throw new Error('Failed to obtain a downstream token. Access denied.');
      }
    } else {
      // Optional: Log or handle cases where no auth token is present, if necessary.
      this.logger.debug(`No authorization header found for request to '${this.options.name}'. Forwarding without token exchange.`);
    }
  }

  /**
   * Performs the OAuth 2.0 Token Exchange request to the Identity Provider.
   * @param {string} subjectToken - The incoming access token from the client.
   * @param {string} audience - The identifier for the target subgraph service.
   * @returns {Promise<string>} A new, audience-restricted access token.
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
      throw error;
    }
  }
}

/**
 * @module AppModule
 * @description The root module for the API Gateway.
 *
 * ARCHITECTURAL REFACTOR:
 * This module configures an Apollo Gateway to compose multiple downstream GraphQL subgraphs.
 * Its security model has been re-architected to implement the OAuth 2.0 Token Exchange flow for all
 * internal service-to-service communication, replacing the previous insecure header-forwarding mechanism.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    // HttpModule is required to provide HttpService for making token exchange requests.
    HttpModule,
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [ConfigModule, HttpModule], // Make ConfigService and HttpService available.
      useFactory: (configService: ConfigService, httpService: HttpService) => {
        const subgraphs = configService.get<any[]>('config.gateway.subgraphs');
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
            supergraphSdl: new IntrospectAndCompose({ subgraphs }),
            // Use a custom buildService function to implement the token exchange logic.
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
})
export class AppModule {}
