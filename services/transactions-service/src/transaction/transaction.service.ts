import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Transaction,
  TransactionsGetRequest,
} from 'plaid';

/**
 * @Injectable
 * Service responsible for all business logic related to financial transactions.
 * It interacts with the Plaid API to fetch transaction data for linked accounts.
 *
 * In a fully event-driven architecture, this service would also listen for events
 * (e.g., via Kafka) such as 'PlaidItemCreated' to receive and securely store
 * new access tokens from the Plaid Integration Service.
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly plaidClient: PlaidApi;

  // --- MOCK PERSISTENCE LAYER ---
  // In a production environment, this data would be stored in a secure, encrypted
  // database (e.g., PostgreSQL, DynamoDB). This in-memory map is for demonstration
  // purposes and would be populated by an event consumer listening to the message bus.
  private itemsByUser = new Map<string, { accessToken: string; itemId: string }>();

  constructor(private configService: ConfigService) {
    const plaidConfig = {
      clientID: this.configService.get<string>('PLAID_CLIENT_ID'),
      secret: this.configService.get<string>('PLAID_SECRET'),
      env: this.configService.get<string>('PLAID_ENV', 'sandbox'),
    };

    if (!plaidConfig.clientID || !plaidConfig.secret) {
      this.logger.error('Plaid client ID or secret is not configured. Transaction service will not function.');
      throw new Error('PLAID_CLIENT_ID and PLAID_SECRET must be set for the TransactionService.');
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

    // On startup, populate with a mock user for demonstration if needed.
    // In a real system, this service would be stateless on startup and populate
    // its cache/database from events or a persistent store.
    this.itemsByUser.set('user-id-mock', {
      accessToken: 'access-sandbox-token-mock',
      itemId: 'item-id-mock',
    });
  }

  /**
   * Retrieves the access token for a given user from the store.
   * @param userId - The ID of the user.
   * @returns The user's Plaid access token.
   * @throws {HttpException} If no token is found for the user.
   */
  private getAccessToken(userId: string): string {
    const item = this.itemsByUser.get(userId);
    if (!item) {
      this.logger.warn(`No Plaid item found for user ${userId}. They may need to link an account.`);
      throw new HttpException('Plaid account not linked for this user.', HttpStatus.NOT_FOUND);
    }
    return item.accessToken;
  }

  /**
   * Fetches transactions for a specific user over a given date range.
   * @param userId The ID of the user.
   * @param startDate The start date for the transaction query (YYYY-MM-DD).
   * @param endDate The end date for the transaction query (YYYY-MM-DD).
   * @param accountIds Optional array of account IDs to filter by.
   * @returns A promise resolving to an array of Plaid Transaction objects.
   */
  async getTransactionsForUser(
    userId: string,
    startDate: string,
    endDate: string,
    accountIds?: string[],
  ): Promise<Transaction[]> {
    const accessToken = this.getAccessToken(userId);

    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 500, // Max count
        offset: 0,
        account_ids: accountIds,
      },
    };

    try {
      this.logger.log(`Fetching transactions for user ${userId} from ${startDate} to ${endDate}.`);
      
      // In a production app with a large number of transactions, you would implement
      // pagination by checking `response.data.total_transactions` and making subsequent
      // calls with an incremented offset.
      const response = await this.plaidClient.transactionsGet(request);
      
      this.logger.log(`Successfully fetched ${response.data.transactions.length} transactions for user ${userId}.`);
      return response.data.transactions;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions for user ${userId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch transaction information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches a single transaction by its ID.
   * Note: Plaid API does not have a direct `get by ID` endpoint.
   * This method would require fetching a date range where the transaction is likely to be
   * and then filtering the results. It can be inefficient.
   * For this example, we'll assume it's part of a larger fetch.
   *
   * @param userId The ID of the user who owns the transaction.
   * @param transactionId The ID of the transaction to find.
   * @returns The found Transaction object or null.
   */
  async findTransactionById(userId: string, transactionId: string): Promise<Transaction | null> {
    const accessToken = this.getAccessToken(userId);
    // This is an inefficient operation. A better approach is to store transactions
    // in this service's own database and query it directly.
    this.logger.warn(`Performing inefficient search for transaction ID ${transactionId}. Consider a local data store.`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 2); // Search over the last 2 years.

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
    };

    try {
      let transactions: Transaction[] = [];
      let total_transactions = 0;
      let hasMore = true;

      // Basic pagination to find the transaction
      while(hasMore) {
        const response = await this.plaidClient.transactionsGet({
          ...request,
          options: { offset: transactions.length, count: 500 }
        });
        const found = response.data.transactions.find(t => t.transaction_id === transactionId);
        if (found) return found;

        transactions = transactions.concat(response.data.transactions);
        total_transactions = response.data.total_transactions;
        hasMore = transactions.length < total_transactions;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error while searching for transaction ID ${transactionId}.`, error.response?.data || error.message);
      throw new HttpException('Could not search for transaction.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  /**
   * Handles an incoming event to store a new Plaid item's credentials.
   * This would be triggered by a message bus (e.g., Kafka) consumer.
   * @param payload The event payload containing user and token info.
   */
  public async handlePlaidItemCreatedEvent(payload: {
    userId: string;
    accessToken: string;
    itemId: string;
  }): Promise<void> {
    this.logger.log(`Received PlaidItemCreated event for user ${payload.userId}. Storing access token.`);
    this.itemsByUser.set(payload.userId, {
      accessToken: payload.accessToken,
      itemId: payload.itemId,
    });
  }
}
