import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  CountryCode,
  Products,
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  TransactionsGetRequest,
  AccountBase,
  Transaction,
  AccountsGetRequest,
  ItemGetResponse,
  AccountsBalanceGetRequest,
  ItemRemoveRequest,
  RemovedTransaction,
  ItemRemoveResponse,
} from 'plaid';

/**
 * Service responsible for all interactions with the Plaid API.
 * This service acts as a clean, typed wrapper around the Plaid client,
 * abstracting the details of API calls from the rest of the application.
 */
@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly plaidClient: PlaidApi;

  constructor(private configService: ConfigService) {
    // Retrieve Plaid configuration from environment variables via ConfigService
    const plaidEnv = this.configService.get<string>('plaid.env');
    const clientId = this.configService.get<string>('plaid.clientId');
    const secret = this.configService.get<string>('plaid.secret');

    if (!plaidEnv || !clientId || !secret) {
      this.logger.error('Plaid configuration is missing. PlaidService will not function.');
      throw new Error('Plaid environment variables (PLAID_ENV, PLAID_CLIENT_ID, PLAID_SECRET) must be set.');
    }
    
    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidEnv],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
    this.logger.log(`Plaid client initialized for environment: ${plaidEnv}`);
  }

  /**
   * Creates a Plaid Link token for a given user.
   * This token is used by the frontend to initialize the Plaid Link flow.
   * @param userId A unique identifier for the end user.
   * @returns The generated link_token and its expiration.
   */
  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string; request_id: string; }> {
    const request: LinkTokenCreateRequest = {
      user: { client_user_id: userId },
      client_name: 'Demo Bank',
      products: [Products.Transactions, Products.Auth],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    try {
      this.logger.log(`Creating Plaid Link token for user: ${userId}`);
      const response = await this.plaidClient.linkTokenCreate(request);
      this.logger.log('Successfully created Plaid Link token.');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Plaid Link token.', error.response?.data || error.message);
      throw new Error('Could not create Plaid Link token.');
    }
  }

  /**
   * Exchanges a temporary public token for a permanent access token and item ID.
   * The access token should be stored securely and associated with the user.
   * @param publicToken The public token from the Plaid Link onSuccess callback.
   * @returns An object containing the access_token and item_id.
   */
  async exchangePublicToken(publicToken: string): Promise<{ access_token: string; item_id: string; request_id: string; }> {
    const request: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    };

    try {
      this.logger.log('Exchanging public token for access token...');
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      this.logger.log(`Successfully exchanged token for item ID: ${response.data.item_id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange public token.', error.response?.data || error.message);
      throw new Error('Could not exchange public token.');
    }
  }

  /**
   * Fetches account information for a given access token.
   * @param accessToken The access token for the Plaid Item.
   * @returns A list of accounts associated with the Item.
   */
  async getAccounts(accessToken: string): Promise<AccountBase[]> {
    const request: AccountsGetRequest = {
      access_token: accessToken,
    };
    try {
      this.logger.log('Fetching accounts...');
      const response = await this.plaidClient.accountsGet(request);
      this.logger.log(`Successfully fetched ${response.data.accounts.length} accounts.`);
      return response.data.accounts;
    } catch (error) {
      this.logger.error('Failed to fetch accounts.', error.response?.data || error.message);
      throw new Error('Could not fetch account information.');
    }
  }

  /**
   * Fetches account balances for a given access token.
   * @param accessToken The access token for the Plaid Item.
   * @returns An object containing accounts and their balances.
   */
  async getBalance(accessToken: string): Promise<{ accounts: AccountBase[] }> {
    const request: AccountsBalanceGetRequest = {
        access_token: accessToken,
    };
    try {
        this.logger.log('Fetching account balances...');
        const response = await this.plaidClient.accountsBalanceGet(request);
        this.logger.log('Successfully fetched balances.');
        return response.data;
    } catch (error) {
        this.logger.error('Failed to fetch balances.', error.response?.data || error.message);
        throw new Error('Could not fetch balance information.');
    }
  }

  /**
   * Fetches transactions for a given access token over a specified date range.
   * @param accessToken The access token for the Plaid Item.
   * @param startDate The start date for the transaction query.
   * @param endDate The end date for the transaction query.
   * @returns A list of transactions.
   */
  async getTransactions(accessToken: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      options: {
        count: 500, // Fetch up to 500 transactions, handle pagination if needed
        offset: 0,
      },
    };

    try {
      this.logger.log(`Fetching transactions from ${formatDate(startDate)} to ${formatDate(endDate)}`);
      // In a real application, you would handle pagination by checking `total_transactions`
      // and making subsequent calls to transactionsGet with an increased offset.
      const response = await this.plaidClient.transactionsGet(request);
      this.logger.log(`Successfully fetched ${response.data.transactions.length} transactions.`);
      return response.data.transactions;
    } catch (error) {
      this.logger.error('Failed to fetch transactions.', error.response?.data || error.message);
      throw new Error('Could not fetch transaction information.');
    }
  }

  /**
   * Fetches information about a Plaid Item.
   * @param accessToken The access token for the Plaid Item.
   * @returns The Item object from Plaid.
   */
  async getItem(accessToken: string): Promise<ItemGetResponse> {
    try {
        this.logger.log('Fetching item information...');
        const response = await this.plaidClient.itemGet({ access_token: accessToken });
        this.logger.log(`Successfully fetched info for item ID: ${response.data.item.item_id}`);
        return response.data;
    } catch (error) {
        this.logger.error('Failed to fetch item information.', error.response?.data || error.message);
        throw new Error('Could not fetch Plaid Item information.');
    }
  }

  /**
   * Removes a Plaid Item. This invalidates the access token.
   * @param accessToken The access token for the Plaid Item to be removed.
   * @returns An object indicating success.
   */
  async removeItem(accessToken: string): Promise<ItemRemoveResponse> {
    const request: ItemRemoveRequest = {
        access_token: accessToken,
    };
    try {
        this.logger.log('Removing Plaid item...');
        const response = await this.plaidClient.itemRemove(request);
        this.logger.log(`Successfully removed item. Request ID: ${response.data.request_id}`);
        return response.data;
    } catch(error) {
        this.logger.error('Failed to remove Plaid item.', error.response?.data || error.message);
        throw new Error('Could not remove Plaid Item.');
    }
  }
}
