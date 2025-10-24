import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

// These types should align with the GraphQL schema of the banking microservice.
// They are defined here for clarity, but in a real monorepo, they might be
// in a shared library, potentially auto-generated from the GraphQL schema.

export interface Account {
  account_id: string;
  name: string;
  mask?: string;
  type: string;
  subtype: string;
  balances: {
    current: number;
    available?: number;
    iso_currency_code: string;
  };
}

export interface Transaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string;
  date: string;
  name: string;
  category: string[];
  pending: boolean;
}

export interface FinancialSummary {
  totalBalance: number;
  balanceChartData: { name: string; value: number }[];
  spendingByCategory: { name: string; value: number }[];
}

/**
 * REFACTORED: BankingService
 *
 * This service has been refactored to act as a client for the new, independent
 * 'banking-service' microservice. It no longer contains direct Plaid API logic
 * or any state (like user access tokens).
 *
 * Its responsibility is to construct GraphQL queries/mutations and send them
 * to the banking subgraph, effectively acting as a proxy between the BFF's
 * GraphQL layer and the downstream service's GraphQL API.
 */
@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);
  private readonly bankingSubgraphUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const bankingSubgraph = this.configService
      .get<any[]>('gateway.subgraphs')
      .find((s) => s.name === 'banking');

    if (!bankingSubgraph || !bankingSubgraph.url) {
      this.logger.error('Banking subgraph URL is not configured!');
      throw new Error('Banking subgraph URL must be configured.');
    }
    this.bankingSubgraphUrl = bankingSubgraph.url;
    this.logger.log(`Banking subgraph client initialized for URL: ${this.bankingSubgraphUrl}`);
  }

  /**
   * A generic method to execute a GraphQL operation against the banking subgraph.
   * @param query The GraphQL query or mutation string.
   * @param variables Optional variables for the operation.
   * @returns The data from the GraphQL response.
   */
  private async querySubgraph<T>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.bankingSubgraphUrl, { query, variables }),
      );

      if (response.data.errors) {
        const error = response.data.errors[0];
        this.logger.error(`GraphQL error from banking subgraph: ${error.message}`, error);
        // Propagate the error message from the subgraph
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to query banking subgraph. URL: ${this.bankingSubgraphUrl}`, error.stack);
      if (error instanceof AxiosError) {
        throw new HttpException(`Network error communicating with banking service: ${error.code}`, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw error; // Re-throw if it's already an HttpException or another error type
    }
  }

  /**
   * Creates a Plaid Link token by calling the banking subgraph.
   * @param userId The ID of the user.
   * @returns The link token and its expiration.
   */
  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string }> {
    const mutation = `
      mutation CreateLinkToken($userId: ID!) {
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
   * Exchanges a public token by calling the banking subgraph.
   * @param publicToken The public token from Plaid Link.
   * @param userId The ID of the user.
   * @returns A boolean indicating success.
   */
  async exchangePublicToken(publicToken: string, userId: string): Promise<boolean> {
    const mutation = `
      mutation ExchangePublicToken($publicToken: String!, $userId: ID!) {
        exchangePublicToken(publicToken: $publicToken, userId: $userId)
      }
    `;
    const data = await this.querySubgraph<{ exchangePublicToken: boolean }>(mutation, { publicToken, userId });
    return data.exchangePublicToken;
  }

  /**
   * Gets all accounts for a user by querying the banking subgraph's federated User entity.
   * @param userId The ID of the user.
   * @returns An array of accounts.
   */
  async getAccounts(userId: string): Promise<Account[]> {
    const query = `
      query GetUserAccounts($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ...on User {
            accounts {
              account_id
              name
              mask
              type
              subtype
              balances {
                current
                available
                iso_currency_code
              }
            }
          }
        }
      }
    `;
    const data = await this.querySubgraph<{ _entities: [{ accounts: Account[] }] }>(query, {
      representations: [{ __typename: 'User', id: userId }],
    });
    return data._entities[0].accounts || [];
  }

  /**
   * Gets transactions for a user by querying the banking subgraph's federated User entity.
   * @param userId The ID of the user.
   * @param accountId Optional account ID to filter transactions.
   * @returns An array of transactions.
   */
  async getTransactions(userId: string, accountId?: string): Promise<Transaction[]> {
    const query = `
      query GetUserTransactions($representations: [_Any!]!, $accountId: ID) {
        _entities(representations: $representations) {
          ...on User {
            transactions(accountId: $accountId) {
              transaction_id
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
    const data = await this.querySubgraph<{ _entities: [{ transactions: Transaction[] }] }>(query, {
      representations: [{ __typename: 'User', id: userId }],
      accountId,
    });
    return data._entities[0].transactions || [];
  }

  /**
   * Gets a financial summary for a user by querying the banking subgraph.
   * @param userId The ID of the user.
   * @returns A financial summary object.
   */
  async getFinancialSummary(userId: string): Promise<FinancialSummary> {
    const query = `
      query GetUserFinancialSummary($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ...on User {
            financialSummary {
              totalBalance
              balanceChartData { name value }
              spendingByCategory { name value }
            }
          }
        }
      }
    `;
    const data = await this.querySubgraph<{ _entities: [{ financialSummary: FinancialSummary }] }>(query, {
      representations: [{ __typename: 'User', id: userId }],
    });
    return data._entities[0].financialSummary;
  }
}
