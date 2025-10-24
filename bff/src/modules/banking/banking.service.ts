import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  TransactionsGetRequest,
} from 'plaid';

// --- DTOs would typically be in their own files under a `dto` directory --- //
// These are included here to make the service self-contained for this example.

export class AccountDto {
  account_id: string;
  name: string;
  official_name: string | null;
  subtype: string | null;
  type: string;
  balance: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
  };
}

export class TransactionDto {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  category: string[] | null;
  date: string;
  name: string;
  merchant_name: string | null;
  pending: boolean;
}

export class FinancialSummaryDto {
  totalBalance: number;
  totalLiabilities: number;
  netWorth: number;
  incomeLast30Days: number;
  expensesLast30Days: number;
  lastUpdated: string;
}

// In-memory store for user access tokens. In a production app, this would be a database (e.g., PostgreSQL, Redis).
const userAccessTokens = new Map<string, { accessToken: string; itemId: string }>();

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);
  private readonly plaidClient: PlaidApi;

  constructor(private configService: ConfigService) {
    const plaidEnv = this.configService.get<string>('plaid.env', 'sandbox');
    const configuration = new Configuration({
      basePath: PlaidEnvironments[plaidEnv],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.configService.get<string>('plaid.clientId'),
          'PLAID-SECRET': this.configService.get<string>('plaid.secret'),
        },
      },
    });

    this.plaidClient = new PlaidApi(configuration);
    this.logger.log(`Plaid client initialized for ${plaidEnv} environment`);
  }

  private getAccessTokenForUser(userId: string): string {
    const tokenInfo = userAccessTokens.get(userId);
    if (!tokenInfo) {
      this.logger.warn(`No access token found for user: ${userId}`);
      throw new HttpException(
        'User has not linked a bank account.',
        HttpStatus.NOT_FOUND,
      );
    }
    return tokenInfo.accessToken;
  }

  async createLinkToken(userId: string): Promise<{ link_token: string; expiration: string }> {
    this.logger.log(`Creating Plaid link token for user: ${userId}`);
    try {
      const response = await this.plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'Demo Bank',
        products: [Products.Transactions, Products.Auth],
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
      throw new HttpException(
        'Could not create Plaid link token.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exchangeAndStorePublicToken(
    publicToken: string,
    userId: string,
    metadata: any, // In a real app, this would be a typed DTO
  ): Promise<void> {
    this.logger.log(`Exchanging public token for user: ${userId}`);
    try {
      const response = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const { access_token, item_id } = response.data;
      this.logger.log(`Successfully exchanged token for item ID: ${item_id}`);

      userAccessTokens.set(userId, { accessToken: access_token, itemId: item_id });
      this.logger.log(`Access token for user ${userId} stored successfully.`);
    } catch (error) {
      this.logger.error(
        'Failed to exchange public token',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Could not exchange public token.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAccounts(userId: string): Promise<AccountDto[]> {
    const accessToken = this.getAccessTokenForUser(userId);
    this.logger.log(`Fetching accounts for user: ${userId}`);

    try {
      const response = await this.plaidClient.accountsGet({
        access_token: accessToken,
      });

      return response.data.accounts.map(
        (acc) =>
          ({
            account_id: acc.account_id,
            name: acc.name,
            official_name: acc.official_name,
            subtype: acc.subtype,
            type: acc.type,
            balance: {
              available: acc.balances.available,
              current: acc.balances.current,
              iso_currency_code: acc.balances.iso_currency_code,
            },
          } as AccountDto),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch accounts for user ${userId}`,
        error.response?.data || error.message,
      );
      throw new HttpException('Could not fetch accounts.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getTransactions(
    userId: string,
    accountId?: string,
  ): Promise<TransactionDto[]> {
    const accessToken = this.getAccessTokenForUser(userId);
    this.logger.log(`Fetching transactions for user: ${userId}`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    try {
      const request: TransactionsGetRequest = {
        access_token: accessToken,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        options: {
          count: 250,
          offset: 0,
          account_ids: accountId ? [accountId] : undefined,
        },
      };

      const response = await this.plaidClient.transactionsGet(request);
      this.logger.log(`Fetched ${response.data.transactions.length} transactions.`);

      return response.data.transactions.map(
        (tx) =>
          ({
            transaction_id: tx.transaction_id,
            account_id: tx.account_id,
            amount: tx.amount,
            iso_currency_code: tx.iso_currency_code,
            category: tx.category,
            date: tx.date,
            name: tx.name,
            merchant_name: tx.merchant_name,
            pending: tx.pending,
          } as TransactionDto),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch transactions for user ${userId}`,
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Could not fetch transactions.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFinancialSummary(userId: string): Promise<FinancialSummaryDto> {
    const accessToken = this.getAccessTokenForUser(userId);
    this.logger.log(`Generating financial summary for user: ${userId}`);

    try {
      const [accountsResponse, transactionsResponse] = await Promise.all([
        this.plaidClient.accountsGet({ access_token: accessToken }),
        this.plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: new Date(new Date().setDate(new Date().getDate() - 30))
            .toISOString()
            .split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        }),
      ]);

      const accounts = accountsResponse.data.accounts;
      const transactions = transactionsResponse.data.transactions;

      let totalBalance = 0;
      let totalLiabilities = 0;
      let incomeLast30Days = 0;
      let expensesLast30Days = 0;

      accounts.forEach((acc) => {
        if (['depository', 'investment', 'brokerage'].includes(acc.type)) {
          totalBalance += acc.balances.current || 0;
        } else if (['credit', 'loan'].includes(acc.type)) {
          totalLiabilities += acc.balances.current || 0;
        }
      });

      transactions.forEach((tx) => {
        if (tx.amount < 0) {
          incomeLast30Days += Math.abs(tx.amount);
        } else {
          expensesLast30Days += tx.amount;
        }
      });

      const summary: FinancialSummaryDto = {
        totalBalance,
        totalLiabilities,
        netWorth: totalBalance - totalLiabilities,
        incomeLast30Days,
        expensesLast30Days,
        lastUpdated: new Date().toISOString(),
      };

      this.logger.log(`Financial summary generated for user ${userId}`);
      return summary;
    } catch (error) {
      this.logger.error(
        `Failed to generate financial summary for user ${userId}`,
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Could not generate financial summary.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
