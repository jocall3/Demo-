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
  AccountsBalanceGetRequest,
} from 'plaid';

/**
 * @Injectable
 * Service responsible for all interactions with the Plaid API.
 * This service acts as the core logic for the Plaid subgraph.
 * It manages Plaid client configuration, secure token handling, and data fetching.
 */
@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly plaidClient: PlaidApi;

  // In a production environment, this data would be stored in a secure database (e.g., PostgreSQL, DynamoDB)
  // and encrypted. Using an in-memory map is for demonstration purposes only.
  private itemsByUser = new Map<string, { accessToken: string; itemId: string }>();

  constructor(private configService: ConfigService) {
    const plaidConfig = {
      clientID: this.configService.get<string>('PLAID_CLIENT_ID'),
      secret: this.configService.get<string>('PLAID_SECRET'),
      env: this.configService.get<string>('PLAID_ENV', 'sandbox'),
    };

    if (!plaidConfig.clientID || !plaidConfig.secret) {
      this.logger.error('Plaid client ID or secret is not configured. Plaid functionality will be disabled.');
      throw new Error('PLAID_CLIENT_ID and PLAID_SECRET must be set.');
    }

    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidConfig.env],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': plaidConfig.clientID,
          'PLAID-SECRET': plaidConfig.secret,
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
    this.logger.log(`Plaid client initialized for '${plaidConfig.env}' environment.`);
  }

  /**
   * Retrieves the access token for a given user from the secure store.
   * @param userId - The ID of the user.
   * @returns The user's Plaid access token.
   * @throws {HttpException} If no token is found for the user.
   */
  private getAccessToken(userId: string): string {
    const item = this.itemsByUser.get(userId);
    if (!item) {
      this.logger.warn(`No Plaid item found for user ${userId}. Account may not be linked.`);
      throw new HttpException('Plaid account not linked for this user.', HttpStatus.NOT_FOUND);
    }
    return item.accessToken;
  }

  /**
   * Creates a Plaid Link token for a given user to initiate the frontend Link flow.
   * @param userId - A unique identifier for the end user.
   * @returns An object containing the generated link_token and its expiration.
   */
  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string }> {
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Demo Bank Platform',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    try {
      this.logger.log(`Creating Plaid Link token for user: ${userId}`);
      const response = await this.plaidClient.linkTokenCreate(request);
      this.logger.log(`Successfully created Plaid Link token for user: ${userId}`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Plaid Link token.', error.response?.data || error.message);
      throw new HttpException('Could not create Plaid Link token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Exchanges a temporary public token from Plaid Link for a permanent access token and item ID.
   * The access token is then stored securely, associated with the user.
   * @param publicToken - The public token from the Plaid Link `onSuccess` callback.
   * @param userId - The user ID to associate with the new Plaid Item.
   * @returns A success status object.
   */
  async exchangePublicToken(publicToken: string, userId: string): Promise<{ success: boolean; item_id: string }> {
    const request: ItemPublicTokenExchangeRequest = { public_token: publicToken };

    try {
      this.logger.log(`Exchanging public token for user: ${userId}`);
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      const { access_token, item_id } = response.data;

      // --- SECURITY CRITICAL --- //
      // In a real application, persist the access_token and item_id in a secure, encrypted database.
      this.itemsByUser.set(userId, { accessToken: access_token, itemId: item_id });
      this.logger.log(`Successfully exchanged and stored access token for item ID: ${item_id}`);

      return { success: true, item_id };
    } catch (error) {
      this.logger.error('Failed to exchange public token.', error.response?.data || error.message);
      throw new HttpException('Could not exchange public token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches account information for a given user.
   * @param userId - The ID of the user.
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
   * Fetches account balances for a given user.
   * @param userId - The ID of the user.
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
   * @param userId - The ID of the user.
   * @param startDate - The start date in 'YYYY-MM-DD' format.
   * @param endDate - The end date in 'YYYY-MM-DD' format.
   * @returns A list of transactions.
   */
  async getTransactions(userId: string, startDate: string, endDate: string): Promise<Transaction[]> {
    const accessToken = this.getAccessToken(userId);

    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 250,
        offset: 0,
      },
    };

    try {
      this.logger.log(`Fetching transactions for user: ${userId} from ${startDate} to ${endDate}`);
      const response = await this.plaidClient.transactionsGet(request);
      this.logger.log(`Successfully fetched ${response.data.transactions.length} transactions.`);
      return response.data.transactions;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions for user ${userId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch transaction information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
