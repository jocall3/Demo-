import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  TransactionsGetRequest,
} from 'plaid';

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);
  private readonly plaidClient: PlaidApi;

  constructor(private configService: ConfigService) {
    const configuration = new Configuration({
      basePath: PlaidEnvironments[this.configService.get('PLAID_ENV')],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.configService.get('PLAID_CLIENT_ID'),
          'PLAID-SECRET': this.configService.get('PLAID_SECRET'),
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
    this.logger.log(`Plaid client initialized for ${this.configService.get('PLAID_ENV')} environment`);
  }

  async createLinkToken(userId: string) {
    this.logger.log(`Creating Plaid link token for user: ${userId}`);
    try {
      const response = await this.plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'Demo Bank BFF',
        products: [Products.Auth, Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
      });
      this.logger.log('Successfully created Plaid link token.');
      return response.data;
    } catch (error) {
      this.logger.error(
        'Failed to create Plaid link token',
        error.response?.data || error.message,
      );
      // In a real app, you would throw a proper NestJS HttpException
      throw new Error('Could not create Plaid link token.');
    }
  }

  async exchangePublicToken(publicToken: string) {
    this.logger.log('Exchanging public token for access token.');
    try {
      const response = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      this.logger.log(`Successfully exchanged token for item ID: ${response.data.item_id}`);
      // IMPORTANT: In a real application, you must securely store the access_token
      // and item_id in a database associated with the user.
      // The access token should NEVER be sent back to the client.
      // It is returned here to be used by other services within the BFF layer.
      return {
        item_id: response.data.item_id,
        access_token: response.data.access_token,
      };
    } catch (error) {
      this.logger.error(
        'Failed to exchange public token',
        error.response?.data || error.message,
      );
      throw new Error('Could not exchange public token.');
    }
  }

  async getAccounts(accessToken: string) {
    this.logger.log('Fetching accounts for an item.');
    try {
      const response = await this.plaidClient.accountsGet({
        access_token: accessToken,
      });
      this.logger.log(`Found ${response.data.accounts.length} accounts.`);
      return response.data;
    } catch (error) {
      this.logger.error(
        'Failed to fetch accounts',
        error.response?.data || error.message,
      );
      throw new Error('Could not fetch accounts.');
    }
  }

  async getTransactions(accessToken: string, startDate: string, endDate: string) {
    this.logger.log(`Fetching transactions from ${startDate} to ${endDate}.`);
    try {
      const request: TransactionsGetRequest = {
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          count: 250,
          offset: 0,
        },
      };
      const response = await this.plaidClient.transactionsGet(request);
      this.logger.log(`Found ${response.data.transactions.length} transactions.`);
      return response.data;
    } catch (error) {
      this.logger.error(
        'Failed to fetch transactions',
        error.response?.data || error.message,
      );
      throw new Error('Could not fetch transactions.');
    }
  }

  async getBalance(accessToken: string) {
    this.logger.log('Fetching balance for accounts.');
    try {
      const response = await this.plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });
      this.logger.log(`Successfully fetched balances.`);
      return response.data;
    } catch (error) {
      this.logger.error(
        'Failed to fetch balance',
        error.response?.data || error.message,
      );
      throw new Error('Could not fetch balance.');
    }
  }
}
