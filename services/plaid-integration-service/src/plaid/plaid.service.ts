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

  // In a production environment, this data would be stored in a secure, encrypted database (e.g., PostgreSQL, DynamoDB).
  // Using in-memory maps is for demonstration purposes only.
  private itemsByUser = new Map<string, { accessToken: string; itemId: string }>();
  // For federation's resolveReference, we need an efficient way to look up a user from an account ID.
  private accountIdToUserId = new Map<string, string>();

  constructor(private configService: ConfigService) {
    const plaidConfig = {
      clientId: this.configService.get<string>('plaid.clientId'),
      secret: this.configService.get<string>('plaid.secret'),
      env: this.configService.get<string>('plaid.env', 'sandbox'),
    };

    if (!plaidConfig.clientId || !plaidConfig.secret) {
      const errorMsg = 'Plaid client ID or secret is not configured. Plaid functionality will be disabled.';
      this.logger.error(errorMsg);
      throw new Error('PLAID_CLIENT_ID and PLAID_SECRET must be set in the configuration.');
    }

    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidConfig.env],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': plaidConfig.clientId,
          'PLAID-SECRET': plaidConfig.secret,
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
    this.logger.log(`Plaid client initialized for '${plaidConfig.env}' environment.`);
  }

  /**
   * Retrieves the access token for a given user from the in-memory store.
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
   * Populates the reverse-lookup map from account ID to user ID after a successful link.
   * @param userId - The ID of the user.
   * @param accessToken - The access token for the new Plaid item.
   */
  private async populateAccountMap(userId: string, accessToken: string): Promise<void> {
    try {
      this.logger.log(`Populating account map for user ${userId}`);
      const response = await this.plaidClient.accountsGet({ access_token: accessToken });
      for (const account of response.data.accounts) {
        this.accountIdToUserId.set(account.account_id, userId);
      }
      this.logger.log(`Mapped ${response.data.accounts.length} accounts to user ${userId}.`);
    } catch (error) {
      this.logger.error(`Failed to populate account map for user ${userId}.`, error.response?.data || error.message);
      // Do not throw here, as the main token exchange was successful.
    }
  }

  /**
   * Creates a Plaid Link token for a given user to initiate the frontend Link flow.
   * @param userId - A unique identifier for the end user.
   * @returns An object containing the generated link_token and its expiration.
   */
  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string }> {
    const request: LinkTokenCreateRequest = {
      user: { client_user_id: userId },
      client_name: 'Demo Bank Platform',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    try {
      this.logger.log(`Creating Plaid Link token for user: ${userId}`);
      const response = await this.plaidClient.linkTokenCreate(request);
      return { link_token: response.data.link_token, expiration: response.data.expiration };
    } catch (error) {
      this.logger.error('Failed to create Plaid Link token.', error.response?.data || error.message);
      throw new HttpException('Could not create Plaid Link token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Exchanges a temporary public token from Plaid Link for a permanent access token and item ID.
   * The access token is then stored, and associated accounts are mapped to the user.
   * @param publicToken - The public token from the Plaid Link `onSuccess` callback.
   * @param userId - The user ID to associate with the new Plaid Item.
   */
  async exchangeAndStorePublicToken(publicToken: string, userId: string): Promise<void> {
    const request: ItemPublicTokenExchangeRequest = { public_token: publicToken };

    try {
      this.logger.log(`Exchanging public token for user: ${userId}`);
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      const { access_token, item_id } = response.data;

      this.itemsByUser.set(userId, { accessToken: access_token, itemId: item_id });
      this.logger.log(`Successfully exchanged and stored access token for item ID: ${item_id}`);

      await this.populateAccountMap(userId, access_token);
    } catch (error) {
      this.logger.error('Failed to exchange public token.', error.response?.data || error.message);
      throw new HttpException('Could not exchange public token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches all account information for a given user.
   * @param userId - The ID of the user.
   * @returns A list of accounts associated with the user's Plaid Item.
   */
  async getAccounts(userId: string): Promise<AccountBase[]> {
    const accessToken = this.getAccessToken(userId);
    try {
      this.logger.log(`Fetching accounts for user: ${userId}`);
      const response = await this.plaidClient.accountsGet({ access_token: accessToken });
      return response.data.accounts;
    } catch (error) {
      this.logger.error(`Failed to fetch accounts for user ${userId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch account information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches the balance for a single account.
   * @param accountId - The unique ID of the account.
   * @returns The balance object for the specified account.
   */
  async getBalanceForAccount(accountId: string): Promise<AccountBase['balances']> {
    const userId = this.accountIdToUserId.get(accountId);
    if (!userId) {
      throw new HttpException(`Could not resolve user for account ${accountId}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const accessToken = this.getAccessToken(userId);
    const request: AccountsBalanceGetRequest = { access_token: accessToken, options: { account_ids: [accountId] } };
    try {
      this.logger.log(`Fetching balance for account: ${accountId}`);
      const response = await this.plaidClient.accountsBalanceGet(request);
      const account = response.data.accounts[0];
      if (!account) {
        throw new HttpException(`Account with id ${accountId} not found for this user.`, HttpStatus.NOT_FOUND);
      }
      return account.balances;
    } catch (error) {
      this.logger.error(`Failed to fetch balance for account ${accountId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch balance information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches transactions for a single account.
   * @param accountId - The unique ID of the account.
   * @param options - Options such as the number of transactions to fetch.
   * @returns A list of transactions for the specified account.
   */
  async getTransactionsForAccount(accountId: string, options: { count: number }): Promise<Transaction[]> {
    const userId = this.accountIdToUserId.get(accountId);
    if (!userId) {
      throw new HttpException(`Could not resolve user for account ${accountId}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const accessToken = this.getAccessToken(userId);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90); // Default to last 90 days
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      options: {
        count: options.count,
        account_ids: [accountId],
      },
    };
    try {
      this.logger.log(`Fetching transactions for account: ${accountId}`);
      const response = await this.plaidClient.transactionsGet(request);
      return response.data.transactions;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions for account ${accountId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch transaction information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches a single account by its ID. Required for GraphQL federation `resolveReference`.
   * @param accountId - The unique ID of the account.
   * @returns The full Account object.
   */
  async getAccountById(accountId: string): Promise<AccountBase> {
    const userId = this.accountIdToUserId.get(accountId);
    if (!userId) {
      throw new HttpException(`Account ${accountId} could not be resolved to a user.`, HttpStatus.NOT_FOUND);
    }
    const accessToken = this.getAccessToken(userId);
    const request: AccountsGetRequest = { access_token: accessToken, options: { account_ids: [accountId] } };
    try {
      this.logger.log(`Resolving account by ID via Plaid: ${accountId}`);
      const response = await this.plaidClient.accountsGet(request);
      const account = response.data.accounts[0];
      if (!account) {
        throw new HttpException(`Account with id ${accountId} not found via Plaid.`, HttpStatus.NOT_FOUND);
      }
      return account;
    } catch (error) {
      this.logger.error(`Failed to resolve account by ID ${accountId}.`, error.response?.data || error.message);
      throw new HttpException('Could not resolve account reference.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
