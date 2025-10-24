import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountBase,
  AccountsGetRequest,
  Configuration,
  CountryCode,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from 'plaid';

/**
 * @Injectable
 * Service responsible for all business logic related to financial accounts.
 * It interacts with the Plaid API to link accounts, fetch account data, and manage balances.
 * This service is a core component of the `accounts-service` microservice.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);
  private readonly plaidClient: PlaidApi;

  // In a production microservice, this would be a persistent, encrypted database (e.g., PostgreSQL, DynamoDB).
  // Using an in-memory map is for demonstration purposes only.
  private itemsByUser = new Map<string, { accessToken: string; itemId: string }>();

  constructor(private configService: ConfigService) {
    const plaidConfig = {
      clientID: this.configService.get<string>('PLAID_CLIENT_ID'),
      secret: this.configService.get<string>('PLAID_SECRET'),
      env: this.configService.get<string>('PLAID_ENV', 'sandbox'),
    };

    if (!plaidConfig.clientID || !plaidConfig.secret) {
      const errorMessage = 'Plaid client ID or secret is not configured. Account functionality will be disabled.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
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
   * Creates a Plaid Link token for a user to initiate the frontend Link flow.
   * @param userId - A unique identifier for the end user.
   * @returns An object containing the generated link_token and its expiration.
   */
  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string }> {
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Demo Bank Platform',
      // Note: We include 'transactions' so the TransactionsService can later fetch them.
      products: [Products.Auth, Products.Transactions, Products.Identity],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    try {
      this.logger.log(`Creating Plaid Link token for user: ${userId}`);
      const response = await this.plaidClient.linkTokenCreate(request);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Plaid Link token.', error.response?.data || error.message);
      throw new HttpException('Could not create Plaid Link token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Exchanges a temporary public token from Plaid Link for a permanent access token and item ID.
   * The access token is then stored securely, associated with the user.
   * In a real event-driven system, this would also publish an `AccountLinked` event.
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
      // Persist the access_token and item_id in a secure, encrypted database.
      this.itemsByUser.set(userId, { accessToken: access_token, itemId: item_id });
      this.logger.log(`Successfully exchanged and stored access token for item ID: ${item_id}`);

      // In a real system, you would publish an event here, e.g.:
      // this.eventEmitter.emit('account.linked', { userId, itemId });

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
  async getAccountsByUserId(userId: string): Promise<AccountBase[]> {
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
}
