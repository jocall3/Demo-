/**
 * @file api-gateway/src/auth/token-exchange.service.ts
 * @description This service implements the OAuth 2.0 Token Exchange flow (RFC 8693).
 * It is responsible for exchanging a client's incoming JWT for a new, narrowly-scoped
 * JWT intended for a specific downstream microservice (subgraph).
 *
 * ARCHITECTURAL OVERVIEW:
 * - Aligns with the "Enforce OAuth 2.0 Token Exchange for All Internal API Calls" directive.
 * - Acts as an adapter in the Hexagonal Architecture, encapsulating communication with the Identity Provider.
 * - Implements in-memory caching to reduce load on the Identity Provider.
 * - Fetches OIDC configuration from the central ConfigService.
 */

import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { URLSearchParams } from 'url';

/**
 * @interface TokenCacheEntry
 * @description Defines the structure for storing a cached access token and its expiration time.
 */
interface TokenCacheEntry {
  /**
   * The exchanged access token (JWT).
   * @type {string}
   */
  accessToken: string;

  /**
   * The timestamp (in seconds since epoch) when the token expires.
   * @type {number}
   */
  expiresAt: number;
}

/**
 * @class TokenExchangeService
 * @description Handles the OAuth 2.0 Token Exchange flow with an Identity Provider (e.g., Keycloak).
 * This service is used by the API Gateway's custom GraphQL data source to secure
 * communication with downstream subgraphs.
 */
@Injectable()
export class TokenExchangeService implements OnModuleInit {
  private readonly logger = new Logger(TokenExchangeService.name);
  private tokenEndpoint: string;
  private clientId: string;
  private clientSecret: string; // This should be fetched from Vault during bootstrap

  /**
   * @description A simple in-memory cache for exchanged tokens.
   * The key is a composite of `audience|subjectToken_hash`.
   * @private
   * @type {Map<string, TokenCacheEntry>}
   */
  private readonly tokenCache = new Map<string, TokenCacheEntry>();

  /**
   * @constructor
   * @param {ConfigService} configService - For accessing application configuration.
   * @param {HttpService} httpService - For making outbound HTTP requests to the Identity Provider.
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * @method onModuleInit
   * @description Lifecycle hook that runs once the module has been initialized.
   * It retrieves and validates the necessary OIDC configuration for token exchange.
   */
  onModuleInit() {
    const issuer = this.configService.get<string>('config.auth.issuer');
    this.clientId = this.configService.get<string>('config.identity.clientId');
    // In a production setup, this secret would be fetched from Vault and injected here,
    // not read directly from environment variables.
    this.clientSecret = this.configService.get<string>('OIDC_CLIENT_SECRET');

    if (!issuer || !this.clientId || !this.clientSecret) {
      this.logger.error(
        'Token Exchange configuration (issuer, clientId, clientSecret) is missing or incomplete.',
      );
      throw new Error('Incomplete OIDC configuration for Token Exchange.');
    }

    // Construct the token endpoint URL from the OIDC issuer URL.
    // Standard OIDC discovery would be more robust, but this is a common convention.
    this.tokenEndpoint = `${issuer.replace(/\/$/, '')}/protocol/openid-connect/token`;

    this.logger.log(
      `TokenExchangeService initialized. Token endpoint: ${this.tokenEndpoint}`,
    );
  }

  /**
   * @method exchangeToken
   * @description Exchanges an incoming subject token for a new token with a specific audience.
   * It checks a local cache for a valid token before contacting the Identity Provider.
   *
   * @param {string} subjectToken - The original JWT from the client request.
   * @param {string} audience - The audience identifier for the target downstream service.
   * @returns {Promise<string>} A promise that resolves to the newly issued access token.
   * @throws {HttpException} If the token exchange fails for any reason.
   */
  public async exchangeToken(
    subjectToken: string,
    audience: string,
  ): Promise<string> {
    // Use a hash or a suffix of the token to avoid storing the full token in memory as a key.
    const cacheKey = `${audience}|${subjectToken.slice(-10)}`;

    const cachedEntry = this.tokenCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now() / 1000) {
      this.logger.debug(`[Cache HIT] Using cached token for audience: ${audience}`);
      return cachedEntry.accessToken;
    }

    this.logger.debug(`[Cache MISS] Performing token exchange for audience: ${audience}`);

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
        this.httpService.post(this.tokenEndpoint, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      if (!data.access_token || !data.expires_in) {
        throw new Error(
          'Token exchange response did not include access_token or expires_in.',
        );
      }

      // Calculate the expiration time with a 30-second buffer to account for network latency.
      const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in - 30;

      this.tokenCache.set(cacheKey, {
        accessToken: data.access_token,
        expiresAt,
      });
      this.logger.debug(`[Cache SET] Stored new token for audience: ${audience}`);

      return data.access_token;
    } catch (error) {
      const errorData = error.response?.data;
      this.logger.error(
        `Token exchange failed for audience ${audience}. Status: ${
          error.response?.status
        }. Error: ${errorData?.error_description || error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to obtain downstream token for service '${audience}': ${
          errorData?.error_description || 'Identity Provider error'
        }`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
