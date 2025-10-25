import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloGatewayDriver, ApolloGatewayDriverConfig } from '@nestjs/apollo';
import { IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { HttpModule, HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration';
import { GraphQLCacheInterceptor } from './cache/graphql-cache.interceptor';

/**
 * @interface TokenCacheEntry
 * @description Defines the structure for storing a cached exchanged token and its expiration.
 */
interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

/**
 * @class TokenExchangingDataSource
 * @extends RemoteGraphQLDataSource
 * @description A custom data source for Apollo Gateway that implements the OAuth 2.0 Token Exchange flow.
 * It enhances security by exchanging the incoming user token for a narrowly-scoped token for each subgraph.
 * It also implements an in-memory (L1) cache for exchanged tokens to reduce latency and load on the Identity Provider.
 */
class TokenExchangingDataSource extends RemoteGraphQLDataSource {
  private readonly logger = new Logger(TokenExchangingDataSource.name);
  private tokenEndpoint: string;
  private clientId: string;
  private clientSecret: string;
  private readonly tokenCache = new Map<string, TokenCacheEntry>();

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
    this.tokenEndpoint = `${issuer}/protocol/openid-connect/token`;
    this.clientId = this.options.configService.get<string>('config.identity.clientId');
    // NOTE: For local development, this is read from config. For production, the ConfigService
    // should be enhanced to fetch this from a secure secrets manager like Vault.
    this.clientSecret = this.options.configService.get<string>('OIDC_CLIENT_SECRET');

    if (!this.tokenEndpoint || !this.clientId || !this.clientSecret) {
      this.logger.error(
        'Token Exchange configuration is missing. Ensure OIDC_ISSUER_URL, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET are configured.',
      );
      throw new Error('Incomplete authentication configuration for token exchange.');
    }
  }

  async willSendRequest({ request, context }) {
    const { headers } = context;

    if (headers?.authorization) {
      const subjectToken = headers.authorization.replace('Bearer ', '');
      try {
        const exchangedToken = await this.exchangeToken(
          subjectToken,
          this.options.name,
        );
        request.http.headers.set('authorization', `Bearer ${exchangedToken}`);
      } catch (error) {
        this.logger.error(
          `Token exchange failed for audience '${this.options.name}'`,
          error.stack,
        );
        throw new Error('Failed to obtain a downstream token. Access denied.');
      }
    } else {
      this.logger.debug(
        `No authorization header found for request to '${this.options.name}'. Forwarding without token exchange.`,
      );
    }
  }

  private async exchangeToken(
    subjectToken: string,
    audience: string,
  ): Promise<string> {
    const cacheKey = `${audience}|${subjectToken.slice(-20)}`;
    const cachedEntry = this.tokenCache.get(cacheKey);

    if (cachedEntry && cachedEntry.expiresAt > Date.now() / 1000) {
      this.logger.debug(
        `[L1 Cache HIT] Using cached token for audience: ${audience}`,
      );
      return cachedEntry.accessToken;
    }

    this.logger.debug(
      `[L1 Cache MISS] Performing token exchange for audience: ${audience}`,
    );

    const params = new URLSearchParams();
    params.append(
      'grant_type',
      'urn:ietf:params:oauth:grant-type:token-exchange',
    );
    params.append('subject_token', subjectToken);
    params.append(
      'subject_token_type',
      'urn:ietf:params:oauth:token-type:access_token',
    );
    params.append('audience', audience);
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);

    try {
      const { data } = await firstValueFrom(
        this.options.httpService.post(this.tokenEndpoint, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      if (!data.access_token || !data.expires_in) {
        throw new Error(
          'Token exchange response did not include access_token or expires_in.',
        );
      }

      // Calculate expiration with a 30-second buffer to account for network latency.
      const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in - 30;
      this.tokenCache.set(cacheKey, { accessToken: data.access_token, expiresAt });
      this.logger.debug(`[L1 Cache SET] Stored new token for audience: ${audience}`);

      return data.access_token;
    } catch (error) {
      const errorData = error.response?.data;
      this.logger.error(
        `HTTP request to IdP failed during token exchange for audience ${audience}: ${
          errorData?.error_description || error.message
        }`,
        error.stack,
      );
      throw error;
    }
  }
}

/**
 * @module AppModule
 * @description The root module for the API Gateway.
 *
 * ARCHITECTURAL REFACTOR:
 * This module configures the Apollo Supergraph Gateway. It has been enhanced to implement
 * a multi-layered caching strategy and a secure service-to-service communication model.
 *
 * 1.  **L1 In-Memory Caching**: The custom `TokenExchangingDataSource` implements an in-memory
 *     cache for exchanged OAuth 2.0 tokens, reducing latency and load on the identity provider.
 * 2.  **L2 Distributed Caching**: It integrates with Redis via `CacheModule` and uses a global
 *     `GraphQLCacheInterceptor` to provide a distributed cache for idempotent GraphQL query results,
 *     reducing load on downstream subgraphs.
 * 3.  **Secure Subgraph Communication**: The `TokenExchangingDataSource` implements the OAuth 2.0
 *     Token Exchange flow for all internal service-to-service communication, replacing insecure
 *     header-forwarding mechanisms.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    HttpModule,
    // Configure L2 distributed cache using Redis.
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          },
        }),
      }),
      inject: [ConfigService],
    }),
    GraphQLModule.forRootAsync<ApolloGatewayDriverConfig>({
      driver: ApolloGatewayDriver,
      imports: [ConfigModule, HttpModule],
      useFactory: (configService: ConfigService, httpService: HttpService) => {
        const subgraphs = configService.get<any[]>('config.gateway.subgraphs');
        if (!subgraphs || subgraphs.length === 0) {
          throw new Error('Gateway subgraphs are not defined in the configuration.');
        }

        return {
          server: {
            context: ({ req }) => ({
              headers: req.headers,
              req, // Pass the full request object to context for the cache interceptor
            }),
          },
          gateway: {
            supergraphSdl: new IntrospectAndCompose({ subgraphs }),
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
      inject: [ConfigService, HttpService],
    }),
  ],
  providers: [
    // Register the GraphQLCacheInterceptor globally for L2 caching.
    {
      provide: APP_INTERCEPTOR,
      useClass: GraphQLCacheInterceptor,
    },
  ],
})
export class AppModule {}
