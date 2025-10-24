import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// Define types that match the GraphQL schema of the plaid-integration subgraph.
// These are essential for type safety when interacting with the subgraph.
export interface PlaidAccount {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  balance: {
    current: number;
    available: number | null;
    iso_currency_code: string | null;
  };
}

export interface PlaidTransaction {
  id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  date: string;
  name: string;
  category: string[];
  pending: boolean;
}

/**
 * REFACTORED: PlaidService
 *
 * This service has been refactored to act as a client for the new, independent
 * 'plaid-integration-service' microservice (subgraph). It no longer contains
 * direct Plaid SDK logic or manages any state like access tokens.
 *
 * Its responsibility is to construct GraphQL queries/mutations and send them
 * to the plaid-integration subgraph, abstracting this communication from the BFF's resolvers.
 */
@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly plaidSubgraphUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Dynamically find the plaid-integration subgraph URL from the gateway configuration.
    const plaidSubgraph = this.configService
      .get<any[]>('gateway.subgraphs', [])
      .find((s) => s.name === 'plaid_integration');

    if (!plaidSubgraph?.url) {
      this.logger.error('Plaid subgraph URL is not configured!');
      throw new Error('Plaid integration subgraph URL must be configured.');
    }
    this.plaidSubgraphUrl = plaidSubgraph.url;
    this.logger.log(`Plaid subgraph client initialized for URL: ${this.plaidSubgraphUrl}`);
  }

  /**
   * A generic method to execute a GraphQL operation against the Plaid subgraph.
   * @param query The GraphQL query or mutation string.
   * @param variables Optional variables for the GraphQL operation.
   * @returns The data from the GraphQL response.
   */
  private async querySubgraph<T>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.plaidSubgraphUrl, { query, variables }),
      );

      if (response.data.errors) {
        const error = response.data.errors[0];
        this.logger.error(`GraphQL error from Plaid subgraph: ${error.message}`, error);
        // Propagate the specific error message from the downstream service.
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to query Plaid subgraph at ${this.plaidSubgraphUrl}`, error.stack);
      if (error instanceof AxiosError) {
        throw new HttpException(`Network error communicating with Plaid service: ${error.code}`, HttpStatus.SERVICE_UNAVAILABLE);
      }
      // Re-throw if it's already an HttpException or another type of error.
      throw error;
    }
  }

  /**
   * Creates a Plaid Link token by calling the plaid-integration subgraph.
   * @param userId The ID of the user.
   * @returns The link token and its expiration.
   */
  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string }> {
    const mutation = `
      mutation CreatePlaidLinkToken($userId: ID!) {
        createLinkToken(userId: $userId) {
          link_token
          expiration
        }
      }
    `;
    const data = await this.querySubgraph<{ createLinkToken: { link_token: string; expiration: string } }>(mutation, { userId });
    return data.createLinkToken;
  }

  /**
   * Exchanges a public token by calling the plaid-integration subgraph.
   * @param publicToken The public token from Plaid Link.
   * @param userId The ID of the user.
   * @returns A boolean indicating success.
   */
  async exchangePublicToken(publicToken: string, userId: string): Promise<boolean> {
    const mutation = `
      mutation ExchangePlaidPublicToken($publicToken: String!, $userId: ID!) {
        exchangePublicToken(publicToken: $publicToken, userId: $userId)
      }
    `;
    const data = await this.querySubgraph<{ exchangePublicToken: boolean }>(mutation, { publicToken, userId });
    return data.exchangePublicToken;
  }

  /**
   * Gets all Plaid accounts for a user by querying the plaid-integration subgraph's federated User entity.
   * @param userId The ID of the user.
   * @returns An array of accounts.
   */
  async getAccounts(userId: string): Promise<PlaidAccount[]> {
    const query = `
      query GetUserPlaidAccounts($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ... on User {
            accounts {
              id
              name
              mask
              type
              subtype
              balance {
                current
                available
                iso_currency_code
              }
            }
          }
        }
      }
    `;
    const data = await this.querySubgraph<{ _entities: [{ accounts: PlaidAccount[] }] }>(query, {
      representations: [{ __typename: 'User', id: userId }],
    });
    return data._entities[0].accounts || [];
  }

  /**
   * Gets transactions for a user by querying the plaid-integration subgraph's federated User entity.
   * @param userId The ID of the user.
   * @param startDate The start date for the transaction query.
   * @param endDate The end date for the transaction query.
   * @returns An array of transactions.
   */
  async getTransactions(userId: string, startDate: string, endDate: string): Promise<PlaidTransaction[]> {
    const query = `
      query GetUserPlaidTransactions($representations: [_Any!]!, $input: TransactionsByDateInput!) {
        _entities(representations: $representations) {
          ... on User {
            transactions(input: $input) {
              id
              account_id
              amount
              iso_currency_code
              date
              name
              category
              pending
            }
          }
        }
      }
    `;
    const data = await this.querySubgraph<{ _entities: [{ transactions: PlaidTransaction[] }] }>(query, {
      representations: [{ __typename: 'User', id: userId }],
      input: { startDate, endDate },
    });
    return data._entities[0].transactions || [];
  }

  // The methods below were part of the original service but are no longer directly
  // exposed by the new subgraph's GraphQL API. `getBalances` is now part of the `getAccounts` call.
  // `getItem` and `removeItem` are internal implementation details of the plaid-integration service.
  // They are removed here to reflect the new, simplified client-side service contract.
}
