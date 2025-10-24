import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountBase,
  AccountsBalanceGetRequest,
  AccountsGetRequest,
  Configuration,
  CountryCode,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  PlaidApi,
  PlaidEnvironments,
  Products,
  Transaction,
  TransactionsGetRequest,
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
      const { link_token, expiration } = response.data;
      return { link_token, expiration };
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
   */
  async exchangeAndStorePublicToken(publicToken: string, userId: string): Promise<void> {
    const request: ItemPublicTokenExchangeRequest = { public_token: publicToken };

    try {
      this.logger.log(`Exchanging public token for user: ${userId}`);
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      const { access_token, item_id } = response.data;

      // --- SECURITY CRITICAL --- //
      // In a real application, persist the access_token and item_id in a secure, encrypted database.
      this.itemsByUser.set(userId, { accessToken: access_token, itemId: item_id });
      this.logger.log(`Successfully exchanged and stored access token for item ID: ${item_id}`);
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
   * Finds the access token that can access a given account ID.
   * NOTE: This is an inefficient mock for demonstration purposes.
   * A real implementation would use a database to map account IDs to user IDs/access tokens.
   * @param accountId The Plaid account ID.
   * @returns The access token.
   */
  private async findAccessTokenForAccount(accountId: string): Promise<string | null> {
    for (const item of this.itemsByUser.values()) {
      try {
        await this.plaidClient.accountsGet({
          access_token: item.accessToken,
          options: { account_ids: [accountId] },
        });
        return item.accessToken; // Found the token that works
      } catch (error) {
        // Ignore errors, this token just can't see the account
        continue;
      }
    }
    return null;
  }

  async getAccountById(accountId: string): Promise<AccountBase> {
    const accessToken = await this.findAccessTokenForAccount(accountId);
    if (!accessToken) {
      throw new HttpException(`Account with ID ${accountId} not found or inaccessible.`, HttpStatus.NOT_FOUND);
    }
    const response = await this.plaidClient.accountsGet({
      access_token: accessToken,
      options: { account_ids: [accountId] },
    });
    return response.data.accounts[0];
  }

  async getBalanceForAccount(accountId: string): Promise<AccountBase['balances']> {
    const accessToken = await this.findAccessTokenForAccount(accountId);
    if (!accessToken) {
      throw new HttpException(`Account with ID ${accountId} not found or inaccessible.`, HttpStatus.NOT_FOUND);
    }

    const request: AccountsBalanceGetRequest = {
      access_token: accessToken,
      options: { account_ids: [accountId] },
    };

    const response = await this.plaidClient.accountsBalanceGet(request);
    if (response.data.accounts.length === 0) {
      throw new HttpException(`Balance for account ${accountId} not found.`, HttpStatus.NOT_FOUND);
    }
    return response.data.accounts[0].balances;
  }

  async getTransactionsForAccount(accountId: string, options: { count: number }): Promise<Transaction[]> {
    const accessToken = await this.findAccessTokenForAccount(accountId);
    if (!accessToken) {
      throw new HttpException(`Account with ID ${accountId} not found or inaccessible.`, HttpStatus.NOT_FOUND);
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90); // Default to last 90 days

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      options: {
        account_ids: [accountId],
        count: options.count,
      },
    };

    const response = await this.plaidClient.transactionsGet(request);
    return response.data.transactions;
  }
}
