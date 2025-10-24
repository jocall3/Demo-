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
} from 'plaid';

// --- DTO Placeholder Interfaces ---
// In a real application, these would be imported from a shared DTOs file.
interface PlaidLinkTokenDto {
  link_token: string;
  expiration: string;
  request_id: string;
}

interface FinancialSummaryDto {
  totalBalance: number;
  totalDebt: number;
  netWorth: number;
  monthlySpending: number;
  monthlyIncome: number;
  accountCount: number;
  transactionCount30d: number;
}

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);
  private readonly plaidClient: PlaidApi;

  // In a real microservice, this would be a database (e.g., PostgreSQL, MongoDB).
  // For this exercise, an in-memory map simulates the persistence layer.
  private userItems = new Map<string, { itemId: string; accessToken: string }>();

  constructor(private configService: ConfigService) {
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
      // This would be a 404 in a REST context, but for a service layer, a clear error is better.
      throw new Error('User has no linked Plaid items.');
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
      const response = await this.plaidClient.itemPublicTokenExchange({ public_token: publicToken });
      const { access_token, item_id } = response.data;

      this.userItems.set(userId, {
        accessToken: access_token,
        itemId: item_id,
      });

      this.logger.log(`Successfully linked item ${item_id} for user ${userId}`);
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
      this.logger.error(`Failed to fetch accounts for user ${userId}`, error.message);
      throw new HttpException('Could not fetch accounts.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTransactions(userId: string, accountId?: string): Promise<Transaction[]> {
    this.logger.log(`Fetching transactions for user ${userId}` + (accountId ? ` for account ${accountId}` : ''));
    try {
      const accessToken = this.getAccessTokenForUser(userId);
      const startDate = new Date();
      const endDate = new Date();
      startDate.setDate(endDate.getDate() - 30); // Last 30 days

      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      const request: TransactionsGetRequest = {
        access_token: accessToken,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        options: {
          count: 250,
          account_ids: accountId ? [accountId] : undefined,
        },
      };
      // Note: For production, use /transactions/sync for updates instead of /transactions/get.
      const response = await this.plaidClient.transactionsGet(request);
      return response.data.transactions;
    } catch (error) {
      this.logger.error(`Failed to fetch transactions for user ${userId}`, error.message);
      throw new HttpException('Could not fetch transactions.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getFinancialSummary(userId: string): Promise<FinancialSummaryDto> {
    this.logger.log(`Generating financial summary for user ${userId}`);
    try {
      const accessToken = this.getAccessTokenForUser(userId);

      const accountsResponse = await this.plaidClient.accountsGet({ access_token: accessToken });
      const accounts = accountsResponse.data.accounts;

      const totalBalance = accounts
        .filter(acc => acc.type === 'depository')
        .reduce((sum, acc) => sum + (acc.balances.current || 0), 0);

      const totalDebt = accounts
        .filter(acc => acc.type === 'credit' || acc.type === 'loan')
        .reduce((sum, acc) => sum + (acc.balances.current || 0), 0);

      const transactions = await this.getTransactions(userId);

      const monthlySpending = transactions
        .filter(tx => tx.amount > 0 && !tx.pending)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const monthlyIncome = transactions
        .filter(tx => tx.amount < 0 && !tx.pending)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

      return {
        totalBalance,
        totalDebt,
        netWorth: totalBalance - totalDebt,
        monthlySpending,
        monthlyIncome,
        accountCount: accounts.length,
        transactionCount30d: transactions.length,
      };
    } catch (error) {
      this.logger.error(`Failed to create financial summary for user ${userId}`, error.message);
      throw new HttpException('Could not create financial summary.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
