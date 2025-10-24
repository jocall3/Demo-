import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
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
  ItemRemoveResponse,
} from 'plaid';

// In a production app, this would be a persistent store (e.g., Redis, PostgreSQL).
const itemsByUser = new Map<string, { accessToken: string; itemId: string }>();

/**
 * Service responsible for all interactions with the Plaid API.
 * This service acts as a clean, typed wrapper around the Plaid client,
 * abstracting the details of API calls and managing user access tokens.
 */
@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly plaidClient: PlaidApi;

  constructor(private configService: ConfigService) {
    const plaidEnv = this.configService.get<string>('PLAID_ENV');
    const clientId = this.configService.get<string>('PLAID_CLIENT_ID');
    const secret = this.configService.get<string>('PLAID_SECRET');

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
   * Retrieves the access token for a given user from the in-memory store.
   * @param userId The unique identifier for the user.
   * @returns The stored Plaid access token.
   * @throws {HttpException} If no access token is found for the user.
   */
  private getAccessToken(userId: string): string {
    const item = itemsByUser.get(userId);
    if (!item) {
      this.logger.warn(`No Plaid access token found for user: ${userId}`);
      throw new HttpException('User has not linked a bank account.', HttpStatus.NOT_FOUND);
    }
    return item.accessToken;
  }

  /**
   * Creates a Plaid Link token for a given user to initialize the frontend Link flow.
   * @param userId A unique identifier for the end user.
   * @returns The generated link_token and its expiration.
   */
  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string; request_id: string }> {
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
      throw new HttpException('Could not create Plaid Link token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Exchanges a temporary public token for a permanent access token and stores it.
   * @param publicToken The public token from the Plaid Link onSuccess callback.
   * @param userId The user ID to associate with the new Plaid Item.
   * @returns An object confirming the success of the operation.
   */
  async exchangeAndStorePublicToken(publicToken: string, userId: string): Promise<{ success: boolean }> {
    const request: ItemPublicTokenExchangeRequest = { public_token: publicToken };

    try {
      this.logger.log(`Exchanging public token for user: ${userId}`);
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      const { access_token, item_id } = response.data;

      itemsByUser.set(userId, { accessToken: access_token, itemId: item_id });
      this.logger.log(`Successfully exchanged and stored access token for item ID: ${item_id}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to exchange public token.', error.response?.data || error.message);
      throw new HttpException('Could not exchange public token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches all account information for a given user.
   * @param userId The ID of the user.
   * @returns A list of accounts associated with the user's Plaid Item.
   */
  async getAccounts(userId: string): Promise<AccountBase[]> {
    const accessToken = this.getAccessToken(userId);
    const request: AccountsGetRequest = { access_token: accessToken };

    try {
      this.logger.log(`Fetching accounts for user: ${userId}`);
      const response = await this.plaidClient.accountsGet(request);
      return response.data.accounts;
    } catch (error) {
      this.logger.error(`Failed to fetch accounts for user ${userId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch account information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches account balances for all of a user's accounts.
   * @param userId The ID of the user.
   * @returns An object containing accounts and their balance information.
   */
  async getBalances(userId: string): Promise<AccountBase[]> {
    const accessToken = this.getAccessToken(userId);
    const request: AccountsBalanceGetRequest = { access_token: accessToken };

    try {
      this.logger.log(`Fetching balances for user: ${userId}`);
      const response = await this.plaidClient.accountsBalanceGet(request);
      return response.data.accounts;
    } catch (error) {
      this.logger.error(`Failed to fetch balances for user ${userId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch balance information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches transactions for a given user over a specified date range.
   * @param userId The ID of the user.
   * @param startDate The start date for the transaction query.
   * @param endDate The end date for the transaction query.
   * @returns A list of transactions.
   */
  async getTransactions(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    const accessToken = this.getAccessToken(userId);
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      options: { count: 500, offset: 0 },
    };

    try {
      this.logger.log(`Fetching transactions for user: ${userId} from ${formatDate(startDate)} to ${formatDate(endDate)}`);
      const response = await this.plaidClient.transactionsGet(request);
      this.logger.log(`Successfully fetched ${response.data.transactions.length} transactions.`);
      return response.data.transactions;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions for user ${userId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch transaction information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches information about a user's Plaid Item.
   * @param userId The ID of the user.
   * @returns The Item object from Plaid.
   */
  async getItem(userId: string): Promise<ItemGetResponse> {
    const accessToken = this.getAccessToken(userId);
    try {
      this.logger.log(`Fetching item information for user: ${userId}`);
      const response = await this.plaidClient.itemGet({ access_token: accessToken });
      this.logger.log(`Successfully fetched info for item ID: ${response.data.item.item_id}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch item information.', error.response?.data || error.message);
      throw new HttpException('Could not fetch Plaid Item information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Removes a user's Plaid Item. This invalidates the access token.
   * @param userId The ID of the user whose item should be removed.
   * @returns An object indicating success.
   */
  async removeItem(userId: string): Promise<ItemRemoveResponse> {
    const accessToken = this.getAccessToken(userId);
    const request: ItemRemoveRequest = { access_token: accessToken };
    try {
      this.logger.log(`Removing Plaid item for user: ${userId}`);
      const response = await this.plaidClient.itemRemove(request);
      itemsByUser.delete(userId); // Also remove from our in-memory store
      this.logger.log(`Successfully removed item for user ${userId}. Request ID: ${response.data.request_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to remove Plaid item for user ${userId}.`, error.response?.data || error.message);
      throw new HttpException('Could not remove Plaid Item.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
