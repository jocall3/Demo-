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
} from 'plaid';

@Injectable()
export class PlaidService {
  private readonly logger = new Logger(PlaidService.name);
  private readonly plaidClient: PlaidApi;

  constructor(private configService: ConfigService) {
    const configuration = new Configuration({
      basePath: PlaidEnvironments[this.configService.get<string>('PLAID_ENV')],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.configService.get<string>('PLAID_CLIENT_ID'),
          'PLAID-SECRET': this.configService.get<string>('PLAID_SECRET'),
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
  }

  /**
   * Creates a Plaid Link token for a given user.
   * This token is used by the frontend to initialize the Plaid Link flow.
   * @param userId - A unique identifier for the end user.
   * @returns The generated link_token.
   */
  async createLinkToken(
    userId: string,
  ): Promise<{ link_token: string; expiration: string }> {
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Demo Bank',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      // Optional: redirect_uri for OAuth flows
      // redirect_uri: this.configService.get<string>('PLAID_OAUTH_REDIRECT_URI'),
    };

    try {
      this.logger.log(`Creating Plaid Link token for user: ${userId}`);
      const response = await this.plaidClient.linkTokenCreate(request);
      this.logger.log('Successfully created Plaid Link token.');
      return {
        link_token: response.data.link_token,
        expiration: response.data.expiration,
      };
    } catch (error) {
      this.logger.error('Failed to create Plaid Link token.', error.response?.data || error.message);
      throw new Error('Could not create Plaid Link token.');
    }
  }

  /**
   * Exchanges a public token received from Plaid Link for an access token.
   * The access token is stored securely and used for subsequent API calls.
   * @param publicToken - The public token from the Plaid Link onSuccess callback.
   * @returns An object containing the access_token and item_id.
   */
  async exchangePublicToken(
    publicToken: string,
  ): Promise<{ access_token: string; item_id: string }> {
    const request: ItemPublicTokenExchangeRequest = {
      public_token: publicToken,
    };

    try {
      this.logger.log('Exchanging public token for access token...');
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      this.logger.log(`Successfully exchanged token for item ID: ${response.data.item_id}`);

      // In a real application, you would persist the access_token and item_id
      // in a secure database, associated with your user.
      // For this BFF, we are returning it, but the controller should handle
      // storing it in a secure, HttpOnly cookie or session.
      return {
        access_token: response.data.access_token,
        item_id: response.data.item_id,
      };
    } catch (error) {
      this.logger.error('Failed to exchange public token.', error.response?.data || error.message);
      throw new Error('Could not exchange public token.');
    }
  }

  /**
   * Fetches account information for a given access token.
   * @param accessToken - The access token for the Plaid Item.
   * @returns A list of accounts associated with the Item.
   */
  async getAccounts(accessToken: string): Promise<AccountBase[]> {
    try {
      this.logger.log('Fetching accounts...');
      const response = await this.plaidClient.accountsGet({
        access_token: accessToken,
      });
      this.logger.log(`Successfully fetched ${response.data.accounts.length} accounts.`);
      return response.data.accounts;
    } catch (error) {
      this.logger.error('Failed to fetch accounts.', error.response?.data || error.message);
      throw new Error('Could not fetch account information.');
    }
  }

  /**
   * Fetches transactions for a given access token over a specified date range.
   * @param accessToken - The access token for the Plaid Item.
   * @returns A list of transactions.
   */
  async getTransactions(accessToken: string): Promise<Transaction[]> {
    // Set a date range for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      options: {
        count: 100, // Fetch up to 100 transactions
        offset: 0,
      },
    };

    try {
      this.logger.log('Fetching transactions...');
      const response = await this.plaidClient.transactionsGet(request);
      this.logger.log(`Successfully fetched ${response.data.transactions.length} transactions.`);
      
      // In a more advanced scenario, you could handle pagination here
      // if total_transactions > transactions.length.

      return response.data.transactions;
    } catch (error) {
      this.logger.error('Failed to fetch transactions.', error.response?.data || error.message);
      throw new Error('Could not fetch transaction information.');
    }
  }
}
