import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  LinkTokenCreateRequest,
  TransactionsGetRequest,
  AccountBase,
  Transaction,
  ItemPublicTokenExchangeRequest,
} from 'plaid';
import { StripeService } from './stripe.service'; // Assuming a Stripe service for payments

// --- DTO Placeholder Interfaces ---
// These interfaces define the shape of data returned by the service methods,
// ensuring a clear contract with the resolvers that consume them.

interface PlaidLinkTokenDto {
  link_token: string;
  expiration: string;
  request_id: string;
}

interface ChartDataPoint {
  name: string;
  value: number;
}

// Aligns with the GraphQL schema requirements for the FinancialSummary type.
interface FinancialSummaryDto {
  totalBalance: number;
  balanceChartData: ChartDataPoint[];
  spendingByCategory: ChartDataPoint[];
}

interface SendMoneyInput {
  userId: string;
  recipient: string;
  amount: number;
  currency?: string;
}


@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);
  private readonly plaidClient: PlaidApi;

  // In a real microservice, this would be a persistent, encrypted database (e.g., PostgreSQL, MongoDB).
  // An in-memory map is used here to simulate the persistence layer for demonstration purposes.
  private userItems = new Map<string, { itemId: string; accessToken: string }>();

  constructor(
    private configService: ConfigService,
    private stripeService: StripeService, // Injected for payment processing
  ) {
    const plaidEnv = this.configService.get('PLAID_ENV', 'sandbox');
    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidEnv],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.configService.get('PLAID_CLIENT_ID'),
          'PLAID-SECRET': this.configService.get('PLAID_SECRET'),
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
    this.logger.log(`Plaid client initialized for ${plaidEnv} environment`);
  }

  private getAccessTokenForUser(userId: string): string {
    const item = this.userItems.get(userId);
    if (!item) {
      throw new HttpException('User has not linked a bank account.', HttpStatus.NOT_FOUND);
    }
    return item.accessToken;
  }

  async createLinkToken(userId: string): Promise<PlaidLinkTokenDto> {
    this.logger.log(`Creating Plaid link token for user: ${userId}`);
    const request: LinkTokenCreateRequest = {
      user: { client_user_id: userId },
      client_name: 'Demo Bank',
      products: [Products.Transactions, Products.Auth, Products.Identity],
      country_codes: [CountryCode.Us],
      language: 'en',
    };
    try {
      const response = await this.plaidClient.linkTokenCreate(request);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to create Plaid link token', error.response?.data || error.message);
      throw new HttpException('Could not create Plaid link token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async exchangeAndStorePublicToken(publicToken: string, userId: string): Promise<{ success: boolean }> {
    this.logger.log(`Exchanging public token for user: ${userId}`);
    try {
      const request: ItemPublicTokenExchangeRequest = { public_token: publicToken };
      const response = await this.plaidClient.itemPublicTokenExchange(request);
      const { access_token, item_id } = response.data;

      this.userItems.set(userId, {
        accessToken: access_token,
        itemId: item_id,
      });

      this.logger.log(`Successfully linked item ${item_id} for user ${userId}`);
      // In a real system, an event 'plaid.item.created' would be emitted here.
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to exchange public token', error.response?.data || error.message);
      throw new HttpException('Could not link account.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAccounts(userId: string): Promise<AccountBase[]> {
    this.logger.log(`Fetching accounts for user ${userId}`);
    try {
      const accessToken = this.getAccessTokenForUser(userId);
      const response = await this.plaidClient.accountsGet({ access_token: accessToken });
      return response.data.accounts;
    } catch (error) {
      this.logger.error(`Failed to fetch accounts for user ${userId}`, error.response?.data || error.message);
      throw new HttpException('Could not fetch accounts.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTransactions(userId: string, accountId?: string): Promise<Transaction[]> {
    this.logger.log(`Fetching transactions for user ${userId}` + (accountId ? ` for account ${accountId}` : ''));
    try {
      const accessToken = this.getAccessTokenForUser(userId);
      const startDate = new Date();
      const endDate = new Date();
      startDate.setDate(endDate.getDate() - 90); // Last 90 days for better summary data

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      const request: TransactionsGetRequest = {
        access_token: accessToken,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        options: {
          count: 500, // Max per request
          account_ids: accountId ? [accountId] : undefined,
        },
      };
      const response = await this.plaidClient.transactionsGet(request);
      return response.data.transactions;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions for user ${userId}`, error.response?.data || error.message);
      throw new HttpException('Could not fetch transactions.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  async sendMoney(input: SendMoneyInput): Promise<string> {
    this.logger.log(`Initiating payment for user ${input.userId} to ${input.recipient}`);
    try {
      // Delegate payment processing to the StripeService
      const charge = await this.stripeService.createCharge({
        amount: input.amount,
        currency: input.currency || 'usd',
        description: `Transfer to ${input.recipient}`,
        source: 'tok_visa', // Placeholder for a real payment source
      });
      this.logger.log(`Stripe charge created with ID: ${charge.id}`);
      return charge.id;
    } catch (error) {
       this.logger.error(`Failed to send money for user ${input.userId}`, error.stack);
       throw new HttpException('Payment processing failed.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFinancialSummary(userId: string): Promise<FinancialSummaryDto> {
    this.logger.log(`Generating financial summary for user ${userId}`);
    try {
      const [accounts, allTransactions] = await Promise.all([
        this.getAccounts(userId),
        this.getTransactions(userId),
      ]);

      // 1. Calculate Total Balance from depository accounts.
      const totalBalance = accounts
        .filter(acc => acc.type === 'depository')
        .reduce((sum, acc) => sum + (acc.balances.current || 0), 0);

      // 2. Calculate Spending by Category.
      const spendingByCategoryMap = new Map<string, number>();
      allTransactions
        .filter(tx => tx.amount > 0 && !tx.pending) // Posted expenses
        .forEach(tx => {
          const category = tx.category?.[0] || 'Uncategorized';
          const currentAmount = spendingByCategoryMap.get(category) || 0;
          spendingByCategoryMap.set(category, currentAmount + tx.amount);
        });

      const spendingByCategory: ChartDataPoint[] = Array.from(
        spendingByCategoryMap,
        ([name, value]) => ({ name, value }),
      ).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5 categories

      // 3. Calculate daily balance for the last 30 days for the chart.
      const dailyNet = new Map<string, number>();
      allTransactions.forEach(tx => {
        const netChange = -tx.amount; // Net change to balance is the inverse of transaction amount
        const currentNet = dailyNet.get(tx.date) || 0;
        dailyNet.set(tx.date, currentNet + netChange);
      });

      const balanceChartData: ChartDataPoint[] = [];
      let rollingBalance = totalBalance;
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = formatDate(date);

        balanceChartData.push({
          name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: rollingBalance,
        });

        const netChangeForDay = dailyNet.get(dateString) || 0;
        // To get the previous day's balance, we reverse the net change of the current day.
        rollingBalance -= netChangeForDay;
      }
      balanceChartData.reverse(); // Order from oldest to newest

      return {
        totalBalance,
        balanceChartData,
        spendingByCategory,
      };
    } catch (error) {
      this.logger.error(`Failed to create financial summary for user ${userId}`, error.stack);
      // If it's an expected error (like no linked account), re-throw it.
      if (error instanceof HttpException) throw error;
      // Otherwise, wrap it.
      throw new HttpException('Could not create financial summary.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
