import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { TransactionFilterInput, TransactionType } from './transaction.resolver';
import { NewTransactionsPayload } from './dto/new-transactions.payload';

/**
 * @Injectable
 * Service responsible for all business logic related to financial transactions.
 * As per the microservice architecture, this service does NOT interact directly with external APIs like Plaid.
 * Instead, it owns the transaction data and manages its persistence in a dedicated database (MongoDB via Mongoose).
 * It is primarily driven by events consumed by the TransactionController.
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Creates multiple transactions in the database from a payload received via an event.
   * This method is designed to be idempotent; it will ignore transactions that already exist.
   * @param payload The event payload containing userId and an array of raw transactions.
   */
  async createMany(payload: NewTransactionsPayload): Promise<void> {
    const { userId, transactions } = payload;
    if (!transactions || transactions.length === 0) {
      this.logger.log(`No transactions to process for userId: ${userId}`);
      return;
    }

    const newTransactions = transactions.map((tx) => ({
      id: tx.transaction_id,
      userId: userId,
      accountId: tx.account_id,
      // Plaid uses positive amounts for debits (expenses)
      type: tx.amount > 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
      description: tx.name,
      // Store amount as a positive value, with type indicating direction
      amount: Math.abs(tx.amount),
      date: tx.date,
      category: tx.category[0] || 'Uncategorized',
      categoryHierarchy: tx.category,
      merchantName: tx.merchant_name,
      pending: tx.pending,
      iso_currency_code: tx.iso_currency_code,
      // This custom field might be added by an enrichment service before this event
      carbonFootprint: tx.carbonFootprint,
    }));

    try {
      // Use insertMany for efficient bulk insertion.
      // `ordered: false` continues inserting even if some documents fail (e.g., duplicate key).
      await this.transactionModel.insertMany(newTransactions, { ordered: false });
      this.logger.log(`Inserted ${newTransactions.length} transactions for user ${userId}.`);
    } catch (error) {
      if (error.code === 11000) {
        // This is expected when re-processing events with duplicates.
        this.logger.log(
          `Bulk write for user ${userId} completed with some duplicate key errors (which is OK).`,
        );
      } else {
        this.logger.error(
          `Error during bulk insert for user ${userId}: ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }
  }

  /**
   * Finds all transactions for a specific user, with optional filtering and pagination.
   * Used by the GraphQL resolver to serve client queries.
   * @param userId The ID of the user.
   * @param filter Optional filters for account, date range, etc.
   * @returns A promise that resolves to an array of Transaction documents.
   */
  async findAllByUserId(
    userId: string,
    filter?: TransactionFilterInput,
  ): Promise<Transaction[]> {
    const query: any = { userId };

    if (filter?.accountId) {
      query.accountId = filter.accountId;
    }
    if (filter?.startDate || filter?.endDate) {
      query.date = {};
      if (filter.startDate) {
        query.date.$gte = filter.startDate;
      }
      if (filter.endDate) {
        query.date.$lte = filter.endDate;
      }
    }

    return this.transactionModel
      .find(query)
      .sort({ date: -1 }) // Default sort by most recent
      .skip(filter?.offset || 0)
      .limit(filter?.limit || 100)
      .exec();
  }

  /**
   * Finds a single transaction by its unique ID.
   * Used by the GraphQL resolver for entity resolution (`@ResolveReference`).
   * @param id The unique ID of the transaction.
   * @returns A promise that resolves to the Transaction document or null.
   */
  async findById(id: string): Promise<Transaction | null> {
    return this.transactionModel.findOne({ id }).exec();
  }

  /**
   * Deletes all transactions associated with a specific account for a user.
   * This is typically called when an `account.removed` event is consumed.
   * @param payload An object containing the userId and accountId.
   */
  async deleteByAccountId(payload: {
    userId: string;
    accountId: string;
  }): Promise<void> {
    const { userId, accountId } = payload;
    this.logger.log(
      `Deleting all transactions for account ${accountId} belonging to user ${userId}.`,
    );
    await this.transactionModel.deleteMany({ userId, accountId }).exec();
  }
}
