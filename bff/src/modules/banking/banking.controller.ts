import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BankingService } from './banking.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CreateLinkTokenRequestDto } from './dto/create-link-token-request.dto';
import { ExchangePublicTokenRequestDto } from './dto/exchange-public-token-request.dto';
import { AccountDto } from './dto/account.dto';
import { TransactionDto } from './dto/transaction.dto';
import { FinancialSummaryDto } from './dto/financial-summary.dto';

@ApiTags('Banking')
@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Post('plaid/create-link-token')
  @ApiOperation({ summary: 'Create a Plaid Link Token for frontend integration.' })
  @ApiBody({ type: CreateLinkTokenRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully created link token.',
    schema: {
      type: 'object',
      properties: {
        link_token: { type: 'string' },
        expiration: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async createLinkToken(@Body() body: CreateLinkTokenRequestDto) {
    try {
      // In a real app, userId would come from an authenticated session/token.
      const { userId } = body;
      return await this.bankingService.createLinkToken(userId);
    } catch (error) {
      console.error(
        'Error creating Plaid link token:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Failed to create Plaid link token.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('plaid/exchange-public-token')
  @ApiOperation({
    summary: 'Exchange a Plaid public token for a permanent access token.',
  })
  @ApiBody({ type: ExchangePublicTokenRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Successfully linked account and exchanged token.',
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async exchangePublicToken(@Body() body: ExchangePublicTokenRequestDto) {
    try {
      const { public_token, userId, metadata } = body;
      await this.bankingService.exchangeAndStorePublicToken(
        public_token,
        userId,
        metadata,
      );
      return { message: 'Account linked successfully.' };
    } catch (error) {
      console.error(
        'Error exchanging public token:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Could not link account.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get all linked bank accounts for a user.' })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: String,
    description: 'The ID of the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'A list of bank accounts.',
    type: [AccountDto],
  })
  async getAccounts(@Query('userId') userId: string): Promise<AccountDto[]> {
    if (!userId) {
      throw new HttpException('A userId must be provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.bankingService.getAccounts(userId);
    } catch (error) {
      console.error(`Error fetching accounts for user ${userId}:`, error);
      throw new HttpException(
        'Failed to fetch accounts.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Get transactions for a user, optionally filtered by account.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: String,
    description: 'The ID of the user.',
  })
  @ApiQuery({
    name: 'accountId',
    required: false,
    type: String,
    description: 'Optional account ID to filter transactions.',
  })
  @ApiResponse({
    status: 200,
    description: 'A list of transactions.',
    type: [TransactionDto],
  })
  async getTransactions(
    @Query('userId') userId: string,
    @Query('accountId') accountId?: string,
  ): Promise<TransactionDto[]> {
    if (!userId) {
      throw new HttpException('A userId must be provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.bankingService.getTransactions(userId, accountId);
    } catch (error) {
      console.error(`Error fetching transactions for user ${userId}:`, error);
      throw new HttpException(
        'Failed to fetch transactions.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get an aggregated financial summary for a user.' })
  @ApiQuery({
    name: 'userId',
    required: true,
    type: String,
    description: 'The ID of the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Aggregated financial summary data.',
    type: FinancialSummaryDto,
  })
  async getFinancialSummary(
    @Query('userId') userId: string,
  ): Promise<FinancialSummaryDto> {
    if (!userId) {
      throw new HttpException('A userId must be provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.bankingService.getFinancialSummary(userId);
    } catch (error) {
      console.error(`Error fetching summary for user ${userId}:`, error);
      throw new HttpException(
        'Failed to fetch financial summary.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
