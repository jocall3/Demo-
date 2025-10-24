import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import {
  AccountBase,
  Configuration,
  CountryCode,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  PlaidApi,
  PlaidEnvironments,
  Products,
  RemovedTransaction,
  Transaction,
  TransactionsSyncRequest,
} from 'plaid';
import { EVENT_BUS_SERVICE } from '../event-bus/event-bus.module';

@Injectable()
export class PlaidService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlaidService.name);
  private readonly plaidClient: PlaidApi;

  // In a production environment, this data would be stored in a secure, encrypted database.
  // Using in-memory maps is for demonstration purposes only.
  private itemsByUser = new Map<string, { accessToken: string; itemId: string; cursor: string | null }>();
  private itemToUser = new Map<string, string>(); // Reverse lookup for webhooks

  constructor(
    private configService: ConfigService,
    @Inject(EVENT_BUS_SERVICE) private readonly eventBus: ClientKafka,
  ) {
    const plaidConfig = {
      clientId: this.configService.get<string>('PLAID_CLIENT_ID'),
      secret: this.configService.get<string>('PLAID_SECRET'),
      env: this.configService.get<string>('PLAID_ENV', 'sandbox'),
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

  async onModuleInit() {
    await this.eventBus.connect();
    this.logger.log('Event bus client connected successfully.');
  }

  async onModuleDestroy() {
    await this.eventBus.close();
    this.logger.log('Event bus client disconnected.');
  }

  private getAccessToken(userId: string): string {
    const item = this.itemsByUser.get(userId);
    if (!item) {
      this.logger.warn(`No Plaid item found for user ${userId}. Account may not be linked.`);
      throw new HttpException('Plaid account not linked for this user.', HttpStatus.NOT_FOUND);
    }
    return item.accessToken;
  }
  
  private findUserByItemId(itemId: string): string | undefined {
    return this.itemToUser.get(itemId);
  }

  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string }> {
    const request: LinkTokenCreateRequest = {
      user: { client_user_id: userId },
      client_name: 'Demo Bank Platform',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: this.configService.get<string>('PLAID_WEBHOOK_URL'),
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

  async exchangeAndStorePublicToken(publicToken: string, userId: string): Promise<{ success: boolean; itemId: string }> {
    const request: ItemPublicTokenExchangeRequest = { public_token: publicToken };

    try {
      this.logger.log(`Exchanging public token for user: ${userId}`);
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      const { access_token, item_id } = response.data;

      // In a real app, this would be a DB transaction to ensure consistency.
      this.itemsByUser.set(userId, { accessToken: access_token, itemId: item_id, cursor: null });
      this.itemToUser.set(item_id, userId);
      this.logger.log(`Successfully exchanged and stored access token for item ID: ${item_id}`);
      
      return { success: true, itemId: item_id };
    } catch (error) {
      this.logger.error('Failed to exchange public token.', error.response?.data || error.message);
      throw new HttpException('Could not exchange public token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async triggerInitialDataSync(userId: string, itemId: string): Promise<void> {
    this.logger.log(`Triggering initial data sync for user ${userId}, item ${itemId}`);
    try {
      const accessToken = this.getAccessToken(userId);
      const accountsResponse = await this.plaidClient.accountsGet({ access_token: accessToken });
      
      this.eventBus.emit('accounts.synced', {
        userId,
        itemId,
        accounts: accountsResponse.data.accounts,
        syncTimestamp: new Date().toISOString(),
      });
      this.logger.log(`Emitted 'accounts.synced' for ${accountsResponse.data.accounts.length} accounts.`);
      
      await this.syncTransactions(accessToken, userId);

    } catch(error) {
      this.logger.error(`Initial data sync failed for user ${userId}, item ${itemId}`, error.stack);
      this.eventBus.emit('plaid.sync.failed', {
        userId,
        itemId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async handleWebhook(webhookPayload: any): Promise<void> {
    const { webhook_type, item_id } = webhookPayload;
    const userId = this.findUserByItemId(item_id);

    if (!userId) {
      this.logger.error(`Received webhook for an unknown item_id: ${item_id}. Ignoring.`);
      return;
    }
    const accessToken = this.getAccessToken(userId);

    switch (webhook_type) {
      case 'DEFAULT_UPDATE':
        this.logger.log(`Handling DEFAULT_UPDATE webhook for item: ${item_id}`);
        await this.syncTransactions(accessToken, userId);
        break;
      
      case 'TRANSACTIONS_REMOVED':
        this.logger.log(`Handling TRANSACTIONS_REMOVED webhook for item: ${item_id}`);
        const removedTransactions: string[] = webhookPayload.removed_transactions;
        this.eventBus.emit('transactions.removed', {
          userId,
          itemId: item_id,
          removedTransactionIds: removedTransactions,
        });
        break;
        
      case 'ITEM_ERROR':
        this.logger.error(`Received ITEM_ERROR webhook for item ${item_id}: ${webhookPayload.error.error_message}`);
        this.eventBus.emit('plaid.item.error', {
          userId,
          itemId: item_id,
          error: webhookPayload.error,
        });
        break;

      default:
        this.logger.log(`Received unhandled Plaid webhook type: ${webhook_type}`);
    }
  }
  
  private async syncTransactions(accessToken: string, userId: string): Promise<void> {
    const userItem = this.itemsByUser.get(userId);
    if (!userItem) {
      this.logger.error(`Cannot sync transactions, no item found for user ${userId}`);
      return;
    }

    let cursor = userItem.cursor;
    let added: Transaction[] = [];
    let modified: Transaction[] = [];
    let removed: RemovedTransaction[] = [];
    let hasMore = true;

    this.logger.log(`Starting transaction sync for user ${userId}, item ${userItem.itemId}`);

    while(hasMore) {
      const request: TransactionsSyncRequest = {
        access_token: accessToken,
        cursor: cursor,
      };
      
      const response = await this.plaidClient.transactionsSync(request);
      const data = response.data;
      
      added = added.concat(data.added);
      modified = modified.concat(data.modified);
      removed = removed.concat(data.removed);
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }
    
    this.logger.log(`Sync completed for user ${userId}. Added: ${added.length}, Modified: ${modified.length}, Removed: ${removed.length}`);
    
    // Update the cursor in our "database"
    this.itemsByUser.set(userId, { ...userItem, cursor });

    if (added.length > 0 || modified.length > 0) {
      this.eventBus.emit('transactions.synced', {
        userId,
        itemId: userItem.itemId,
        transactions: [...added, ...modified],
        syncTimestamp: new Date().toISOString(),
      });
      this.logger.log(`Emitted 'transactions.synced' event for user ${userId}`);
    }
    if (removed.length > 0) {
       this.eventBus.emit('transactions.removed', {
          userId,
          itemId: userItem.itemId,
          removedTransactionIds: removed.map(tx => tx.transaction_id),
        });
        this.logger.log(`Emitted 'transactions.removed' event for user ${userId}`);
    }
  }

  // --- Methods for GraphQL Resolvers ---
  // These are synchronous queries against Plaid, typically used to fulfill GraphQL requests from the gateway.
  
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

  async getTransactions(userId: string, startDate: string, endDate: string): Promise<Transaction[]> {
    const accessToken = this.getAccessToken(userId);
    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    };
    try {
      this.logger.log(`Fetching transactions for user ${userId} from ${startDate} to ${endDate}`);
      const response = await this.plaidClient.transactionsGet(request);
      return response.data.transactions;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions for user ${userId}.`, error.response?.data || error.message);
      throw new HttpException('Could not fetch transaction information.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTransactionById(transactionId: string): Promise<Transaction> {
    this.logger.warn(`getTransactionById is a mock implementation. Transaction ID: ${transactionId}`);
    // This is a mock response. A real implementation would query a local database populated by sync events.
    return {
      transaction_id: transactionId,
      account_id: 'mock_account_id',
      date: new Date().toISOString().split('T')[0],
      name: 'Mocked Transaction (Direct Fetch)',
      amount: 12.34,
      iso_currency_code: 'USD',
      category: ['Mock'],
      pending: false,
      transaction_type: 'special',
      // other required fields
      account_owner: null,
      authorized_date: null,
      authorized_datetime: null,
      datetime: null,
      location: {
        address: null, city: null, region: null, postal_code: null, country: null,
        lat: null, lon: null, store_number: null
      },
      merchant_name: 'Mock Merchant',
      payment_channel: 'other',
      payment_meta: { by_order_of: null, payee: null, payer: null, payment_method: null, payment_processor: null, ppd_id: null, reason: null, reference_number: null },
      pending_transaction_id: null
    };
  }

  async getAccountById(accountId: string): Promise<AccountBase> {
    // This is inefficient. In production, we'd have a DB table `accounts` with a `user_id`.
    const userId = this.findUserByAccountId(accountId);
     if (!userId) {
      throw new HttpException(`Account ${accountId} could not be resolved to a user.`, HttpStatus.NOT_FOUND);
    }
    const accounts = await this.getAccounts(userId);
    const account = accounts.find(a => a.account_id === accountId);
    if (!account) {
       throw new HttpException(`Account with id ${accountId} not found via Plaid.`, HttpStatus.NOT_FOUND);
    }
    return account;
  }

  private findUserByAccountId(accountId: string): string | undefined {
    let foundUserId: string | undefined;
    this.itemToUser.forEach((userId, itemId) => {
        // This is still a mock; we don't have account->item mapping here.
        // We'll just grab the first user's token and hope it works for now.
        // A real DB would solve this.
        if(!foundUserId) foundUserId = userId;
    });
    return foundUserId;
  }
}
