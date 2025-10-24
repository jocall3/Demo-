import { Controller, Post, Body, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PlaidService } from './plaid.service';

// DTOs defined inline for simplicity. In a larger app, these would be in separate files.
interface CreateLinkTokenBody {
  userId: string;
}

interface ExchangePublicTokenBody {
  public_token: string;
  userId: string; // To associate the access token with a user
}

interface GetAccountsQuery {
  userId: string;
}

interface GetTransactionsQuery {
  userId: string;
  startDate: string;
  endDate: string;
}

@Controller('plaid')
export class PlaidController {
  constructor(private readonly plaidService: PlaidService) {}

  /**
   * Creates a Plaid link_token for the frontend to initialize Plaid Link.
   * The frontend calls this endpoint first to start the account linking process.
   * @param {CreateLinkTokenBody} body - Contains the userId to associate with the token.
   * @returns The link_token.
   */
  @Post('create-link-token')
  async createLinkToken(@Body() body: CreateLinkTokenBody) {
    try {
      // In a real-world application, the userId would be retrieved from an authenticated session (e.g., JWT payload)
      // rather than being passed in the body for security reasons.
      const linkToken = await this.plaidService.createLinkToken(body.userId);
      return { link_token: linkToken };
    } catch (error) {
      console.error('Error creating Plaid link token:', error);
      throw new HttpException('Could not create Plaid link token.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Exchanges a temporary public_token from Plaid Link for a permanent access_token.
   * This access_token is then stored securely on the server, associated with the user.
   * @param {ExchangePublicTokenBody} body - Contains the public_token from the Plaid Link flow and the userId.
   * @returns A success message.
   */
  @Post('exchange-public-token')
  async setAccessToken(@Body() body: ExchangePublicTokenBody) {
    try {
      // The service layer handles the token exchange and secure storage of the access_token.
      await this.plaidService.exchangePublicToken(
        body.public_token,
        body.userId,
      );
      return { success: true, message: 'Account linked successfully.' };
    } catch (error) {
      console.error('Error exchanging Plaid public token:', error);
      throw new HttpException('Could not link account.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches accounts for a given user.
   * @param {GetAccountsQuery} query - Contains the userId.
   * @returns A list of the user's financial accounts.
   */
  @Get('accounts')
  async getAccounts(@Query() query: GetAccountsQuery) {
    try {
      // The service layer would look up the access token based on the userId from a secure session.
      // Passing userId as a query parameter is a simplification for this architectural demonstration.
      const accounts = await this.plaidService.getAccounts(query.userId);
      return accounts;
    } catch (error) {
      console.error(`Error fetching accounts for user ${query.userId}:`, error);
      throw new HttpException('Could not fetch accounts.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Fetches transactions for a given user within a specified date range.
   * @param {GetTransactionsQuery} query - Contains userId and the start/end dates.
   * @returns A list of transactions.
   */
  @Get('transactions')
  async getTransactions(@Query() query: GetTransactionsQuery) {
    try {
      // Similar to getAccounts, the service layer would handle retrieving the correct access token securely.
      const transactions = await this.plaidService.getTransactions(
        query.userId,
        query.startDate,
        query.endDate,
      );
      return transactions;
    } catch (error) {
      console.error(`Error fetching transactions for user ${query.userId}:`, error);
      throw new HttpException('Could not fetch transactions.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
