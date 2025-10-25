import { Injectable, Logger, HttpException, HttpStatus, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Client as TemporalClient, Connection as TemporalConnection, ConnectionOptions } from '@temporalio/client';

// --- DTO Placeholder Interfaces ---
// These interfaces define the shape of data transferred between this service
// and other microservices, aligning with their respective GraphQL/gRPC schemas.
// In a full API-as-Code setup, these would be auto-generated from schema definitions.

interface PlaidLinkTokenDto {
  link_token: string;
  expiration: string;
}

interface FinancialSummaryDto {
  totalBalance: number;
  balanceChartData: ChartDataPoint[];
  spendingByCategory: ChartDataPoint[];
}

interface ChartDataPoint {
  name: string;
  value: number;
}

interface InitiatePaymentInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: string;
  userId: string; // User initiating the payment
}

interface ExchangePublicTokenInput {
  publicToken: string;
  userId: string;
}

interface AccountDto {
    id: string;
    name: string;
    mask: string | null;
    type: string;
    subtype: string | null;
    balance: {
        available: number | null;
        current: number;
        iso_currency_code: string | null;
    };
}

interface TransactionDto {
    id: string;
    accountId: string;
    type: 'INCOME' | 'EXPENSE';
    description: string;
    amount: number;
    date: string;
    category: string;
    categoryHierarchy: string[];
    carbonFootprint?: number | null;
}

// --- Temporal Client Injection Token (Assumed to be globally available or provided by a TemporalModule in this service) ---
export const TEMPORAL_CLIENT = 'TEMPORAL_CLIENT';

@Injectable()
export class BankingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BankingService.name);
  private plaidIntegrationServiceUrl: string;
  private accountsServiceUrl: string;
  private transactionsServiceUrl: string;
  private temporalAddress: string;
  private temporalNamespace: string;
  private temporalTransactionsTaskQueue: string;

  private temporalConnection: TemporalConnection;
  private temporalClientInstance: TemporalClient;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.plaidIntegrationServiceUrl = this.configService.get<string>('PLAID_INTEGRATION_SERVICE_URL');
    this.accountsServiceUrl = this.configService.get<string>('ACCOUNTS_SERVICE_URL');
    this.transactionsServiceUrl = this.configService.get<string>('TRANSACTIONS_SERVICE_URL');
    this.temporalAddress = this.configService.get<string>('TEMPORAL_ADDRESS', 'localhost:7233');
    this.temporalNamespace = this.configService.get<string>('TEMPORAL_NAMESPACE', 'default');
    this.temporalTransactionsTaskQueue = this.configService.get<string>('TEMPORAL_TRANSACTIONS_TASK_QUEUE', 'transactions-task-queue');

    if (!this.plaidIntegrationServiceUrl || !this.accountsServiceUrl || !this.transactionsServiceUrl) {
      this.logger.error('Missing configuration for downstream services (Plaid, Accounts, Transactions).');
      throw new Error('Downstream service URLs must be configured.');
    }
  }

  async onModuleInit() {
    // Initialize Temporal Client
    const connectionOptions: ConnectionOptions = {
      address: this.temporalAddress,
      // In production, configure TLS options here.
      // tls: configService.get('TEMPORAL_TLS') ? { ... } : false,
    };

    try {
      this.logger.log(`Attempting to connect to Temporal at ${this.temporalAddress}...`);
      this.temporalConnection = await TemporalConnection.connect(connectionOptions);
      this.temporalClientInstance = new TemporalClient({
        connection: this.temporalConnection,
        namespace: this.temporalNamespace,
      });
      this.logger.log(`Temporal Client initialized for namespace "${this.temporalNamespace}".`);
    } catch (err) {
      this.logger.error('Failed to connect to Temporal cluster.', err.stack);
      throw new Error('Could not connect to Temporal workflow engine.');
    }
  }

  async onModuleDestroy() {
    if (this.temporalConnection) {
      await this.temporalConnection.close();
      this.logger.log('Temporal client connection closed.');
    }
  }

  /**
   * Generic GraphQL request helper for downstream services.
   * Automatically injects necessary headers (e.g., Authorization from a context).
   */
  private async callSubgraph<T>(serviceUrl: string, query: string, variables: any = {}): Promise<T> {
    try {
      // In a real setup, authorization tokens would be added here,
      // possibly from a local cache or derived from an incoming request's context.
      const headers = {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}` // Example if this service received a token to forward
      };

      const response = await firstValueFrom(
        this.httpService.post(serviceUrl, { query, variables }, { headers })
      );
      if (response.data.errors) {
        const error = response.data.errors[0];
        this.logger.error(`GraphQL error from ${serviceUrl}: ${error.message}`, error.extensions?.code);
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to communicate with subgraph at ${serviceUrl}`, error.stack);
      // Distinguish between network errors and upstream application errors
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Service communication error with ${serviceUrl}.`, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Delegates to the Plaid Integration Service to create a Link token.
   * @param userId - The ID of the user.
   * @returns The Plaid Link token details.
   */
  async createLinkToken(userId: string): Promise<PlaidLinkTokenDto> {
    this.logger.log(`Delegating createLinkToken for user ${userId} to PlaidIntegrationService.`);
    const query = `
      mutation CreateLinkToken($userId: ID!) {
        createLinkToken(userId: $userId) {
          link_token
          expiration
        }
      }
    `;
    const data = await this.callSubgraph<{ createLinkToken: PlaidLinkTokenDto }>(
      this.plaidIntegrationServiceUrl,
      query,
      { userId }
    );
    return data.createLinkToken;
  }

  /**
   * Delegates to the Plaid Integration Service to exchange a public token.
   * @param input - Contains the Plaid public token and user ID.
   * @returns A boolean indicating success.
   */
  async exchangeAndStorePublicToken(input: ExchangePublicTokenInput): Promise<boolean> {
    this.logger.log(`Delegating exchangePublicToken for user ${input.userId} to PlaidIntegrationService.`);
    const query = `
      mutation ExchangePublicToken($publicToken: String!, $userId: ID!) {
        exchangePublicToken(publicToken: $publicToken, userId: $userId)
      }
    `;
    const data = await this.callSubgraph<{ exchangePublicToken: boolean }>(
      this.plaidIntegrationServiceUrl,
      query,
      { publicToken: input.publicToken, userId: input.userId }
    );
    return data.exchangePublicToken;
  }

  /**
   * Initiates a payment workflow in the Transactions Service.
   * This service acts as a client to start the durable workflow.
   * @param input The payment details.
   * @returns The workflow ID for tracking.
   */
  async sendMoney(input: InitiatePaymentInput): Promise<string> {
    this.logger.log(`Initiating sendMoney workflow for user ${input.userId} from ${input.sourceAccountId} to ${input.destinationAccountId} with amount ${input.amount} ${input.currency}.`);

    if (!this.temporalClientInstance) {
      throw new HttpException('Payment processing service is unavailable.', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // The 'paymentWorkflow' is defined in the transactions-service.
    // This service acts as a client to start it.
    const handle = await this.temporalClientInstance.workflow.start('paymentWorkflow', {
      taskQueue: this.temporalTransactionsTaskQueue,
      workflowId: `payment-${input.userId}-${input.sourceAccountId}-${input.destinationAccountId}-${Date.now()}`, // Ensure unique workflow ID
      args: [input],
    });

    this.logger.log(`Payment workflow started successfully with ID: ${handle.workflowId}`);
    return handle.workflowId;
  }

  /**
   * Aggregates financial summary data by querying the Accounts and Transactions services.
   * This acts as a read model aggregator.
   * @param userId The ID of the user.
   * @returns A comprehensive financial summary.
   */
  async getFinancialSummary(userId: string): Promise<FinancialSummaryDto> {
    this.logger.log(`Aggregating financial summary for user ${userId}.`);
    try {
      // Fetch accounts from Accounts Service
      const accountsQuery = `
        query GetUserAccounts($userId: ID!) {
          user(id: $userId) {
            accounts {
              id
              name
              type
              balance {
                current
                iso_currency_code
              }
            }
          }
        }
      `;
      const accountsData = await this.callSubgraph<{ user: { accounts: AccountDto[] } }>(
        this.accountsServiceUrl,
        accountsQuery,
        { userId }
      );
      const accounts = accountsData.user?.accounts || [];

      // Fetch transactions from Transactions Service
      const transactionsQuery = `
        query GetUserTransactions($userId: ID!) {
          user(id: $userId) {
            transactions {
              id
              type
              amount
              date
              category
            }
          }
        }
      `;
      const transactionsData = await this.callSubgraph<{ user: { transactions: TransactionDto[] } }>(
        this.transactionsServiceUrl,
        transactionsQuery,
        { userId }
      );
      const transactions = transactionsData.user?.transactions || [];

      // --- Perform Aggregations (Read Model Logic) ---
      const totalBalance = accounts
        .filter(acc => acc.type === 'depository')
        .reduce((sum, acc) => sum + (acc.balance.current || 0), 0);

      const spendingByCategoryMap = new Map<string, number>();
      transactions
        .filter(tx => tx.type === 'EXPENSE')
        .forEach(tx => {
          const category = tx.category || 'Uncategorized';
          spendingByCategoryMap.set(category, (spendingByCategoryMap.get(category) || 0) + tx.amount);
        });
      const spendingByCategory = Array.from(spendingByCategoryMap, ([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 categories

      // Simulate balance chart data or derive from snapshots/events for a real CQRS system
      const balanceChartData: ChartDataPoint[] = [];
      const numDays = 30;
      let currentRunningBalance = totalBalance; // Start with current balance

      // To approximate historical balance for the chart, reverse-calculate from current balance
      const dailyNetChanges = new Map<string, number>();
      transactions.forEach(tx => {
          const change = tx.type === 'INCOME' ? tx.amount : -tx.amount;
          dailyNetChanges.set(tx.date, (dailyNetChanges.get(tx.date) || 0) + change);
      });

      for (let i = 0; i < numDays; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (numDays - 1 - i)); // Iterate from oldest date to newest
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Store current balance for this day
        balanceChartData.push({ name: dateString, value: currentRunningBalance });

        // To calculate previous day's balance, subtract this day's net change
        const txDateKey = date.toISOString().split('T')[0];
        currentRunningBalance -= (dailyNetChanges.get(txDateKey) || 0);
      }

      return {
        totalBalance,
        balanceChartData,
        spendingByCategory,
      };
    } catch (error) {
      this.logger.error(`Failed to generate financial summary for user ${userId}`, error.stack);
      throw new HttpException('Could not generate financial summary.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
