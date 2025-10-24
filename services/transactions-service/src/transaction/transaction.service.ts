import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Client as TemporalClient } from '@temporalio/client';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { TransactionFilterInput, TransactionType } from './transaction.resolver';
import { NewTransactionsPayload } from './dto/new-transactions.payload';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { paymentWorkflow } from '../workflow/payment.workflow';
import { TEMPORAL_CLIENT } from '../temporal/temporal.constants';

/**
 * @Injectable
 * Service responsible for all business logic related to financial transactions.
 * As per the new microservice architecture, this service acts as the source of truth for transaction data
 * and is the entry point for initiating complex, long-running financial operations as durable workflows.
 *
 * It manages transaction persistence in MongoDB and integrates with a workflow orchestration engine (e.g., Temporal)
 * to manage Sagas like multi-step payments, ensuring reliability, atomicity, and visibility for critical operations.
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @Inject(TEMPORAL_CLIENT) private readonly temporalClient: TemporalClient,
  ) {}

  /**
   * Initiates a multi-step payment process as a durable, stateful workflow.
   * This replaces a complex, event-driven choreography with an orchestrated Saga, providing
   * full visibility, automatic retries, and compensation logic for failures.
   *
   * @param paymentDetails The details of the payment to be initiated.
   * @returns The workflow ID for tracking.
   */
  async initiatePayment(paymentDetails: InitiatePaymentDto): Promise<string> {
    const { fromAccountId, toAccountId, amount, currency, userId } = paymentDetails;
    const workflowId = `payment-${uuidv4()}`;

    this.logger.log(
      `Starting payment workflow ${workflowId} for ${amount} ${currency} from ${fromAccountId} to ${toAccountId}`,
    );

    // 1. Create a PENDING transaction record in the local database.
    // The workflow will update this record as it progresses through its activities.
    const pendingTx = new this.transactionModel({
      id: workflowId, // Use workflowId as the transaction ID for correlation
      accountId: fromAccountId,
      userId: userId,
      type: TransactionType.EXPENSE,
      description: `Payment to ${toAccountId} [Pending]`, // Initial description
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      category: 'Transfer',
      categoryHierarchy: ['Transfer', 'P2P'],
      pending: true,
      iso_currency_code: currency,
    });
    await pendingTx.save();
    this.logger.log(`Created PENDING transaction record for workflow ${workflowId}`);

    // 2. Start the workflow execution. This is an asynchronous RPC to the workflow engine.
    const handle = await this.temporalClient.workflow.start(paymentWorkflow, {
      taskQueue: 'payments-task-queue',
      workflowId: workflowId,
      args: [paymentDetails],
    });

    this.logger.log(`Workflow started successfully with ID: ${handle.workflowId}`);

    // 3. Return the workflowId to the caller for tracking.
    return handle.workflowId;
  }

  /**
   * Updates the status and details of a transaction. This method is designed to be called by
   * activities within a workflow to reflect the progress of the Saga (e.g., 'COMPLETED', 'FAILED').
   * @param transactionId The ID of the transaction to update (corresponds to workflowId).
   * @param status The final status of the transaction.
   * @param details A descriptive message for the final state (e.g., success or failure reason).
   * @returns The updated transaction document.
   */
  async updateTransactionStatus(
    transactionId: string,
    status: 'COMPLETED' | 'FAILED',
    details: string,
  ): Promise<Transaction> {
    this.logger.log(`Updating status of transaction ${transactionId} to ${status} with details: "${details}"`);
    const transaction = await this.transactionModel.findOneAndUpdate(
      { id: transactionId },
      {
        $set: {
          pending: status !== 'COMPLETED',
          description: details,
        },
      },
      { new: true },
    );

    if (!transaction) {
      this.logger.error(`Transaction with ID ${transactionId} not found for status update.`);
      throw new NotFoundException(`Transaction with ID ${transactionId} not found.`);
    }

    return transaction;
  }

  /**
   * Creates multiple transactions in the database from a payload received via an event.
   * This method is idempotent and handles bulk ingestion from data sync events.
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
      type: tx.amount > 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
      description: tx.name,
      amount: Math.abs(tx.amount),
      date: tx.date,
      category: tx.category[0] || 'Uncategorized',
      categoryHierarchy: tx.category,
      merchantName: tx.merchant_name,
      pending: tx.pending,
      iso_currency_code: tx.iso_currency_code,
      carbonFootprint: tx.carbonFootprint,
    }));

    try {
      await this.transactionModel.insertMany(newTransactions, { ordered: false });
      this.logger.log(`Inserted ${newTransactions.length} transactions for user ${userId}.`);
    } catch (error) {
      if (error.code === 11000) {
        this.logger.log(
          `Bulk write for user ${userId} completed with some duplicate key errors (idempotency check passed).`,
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
      .sort({ date: -1 })
      .skip(filter?.offset || 0)
      .limit(filter?.limit || 100)
      .exec();
  }

  /**
   * Finds a single transaction by its unique ID.
   * @param id The unique ID of the transaction.
   * @returns A promise that resolves to the Transaction document or null.
   */
  async findById(id: string): Promise<Transaction | null> {
    return this.transactionModel.findOne({ id }).exec();
  }

  /**
   * Deletes all transactions associated with a specific account for a user.
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
