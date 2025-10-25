import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client as TemporalClient } from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';

import { Transaction } from './entities/transaction.entity';
import { TransactionFilterInput, InitiatePaymentInput } from './dto/transaction.inputs';
import { NewTransactionsPayload } from './dto/new-transactions.payload';
import { paymentWorkflow } from '../temporal/workflows';
import { TEMPORAL_CLIENT } from '../temporal/temporal.constants';
import { KAFKA_PRODUCER_CLIENT } from '../event-bus/event-bus.module';
import { ClientKafka } from '@nestjs/microservices';

/**
 * @class TransactionService
 * @description This service class adheres to CQRS principles within a Hexagonal Architecture.
 * It is the primary application service for the Transaction bounded context.
 *
 * Command-Side Responsibilities:
 * - Handles incoming commands (e.g., `initiatePayment`).
 * - Does NOT mutate state directly. Instead, it initiates durable workflows (Sagas)
 *   via a workflow orchestration engine (Temporal) for complex, multi-step business processes.
 * - For simpler state changes, it would publish domain events to an event store (Kafka).
 *
 * Query-Side Responsibilities:
 * - Provides methods to query a denormalized, optimized read model (e.g., `findById`, `findAllByUserId`).
 * - The read model is populated asynchronously by separate event handlers (projectors).
 *
 * Read Model Projection Responsibilities:
 * - Includes methods (`updateReadModel...`, `deleteTransactionsFromReadModel`) that are invoked
 *   by event handlers (in `transaction.controller.ts`) to maintain the read model's consistency with the event stream.
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  /**
   * @constructor
   * @param {TemporalClient} temporalClient - The client for interacting with the Temporal workflow engine. This is an injected port.
   * @param {ClientKafka} eventPublisher - The client for publishing events to the Kafka message bus. This is an injected port.
   * @param {Repository<Transaction>} transactionRepository - The repository for the Transaction read model. This is an injected adapter.
   */
  constructor(
    @Inject(TEMPORAL_CLIENT) private readonly temporalClient: TemporalClient,
    @Inject(KAFKA_PRODUCER_CLIENT) private readonly eventPublisher: ClientKafka,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  // =============================================================================
  // COMMAND-SIDE METHODS
  // These methods initiate state changes but do not directly mutate state.
  // =============================================================================

  /**
   * Initiates a multi-step payment transfer as a durable, stateful workflow using Temporal.
   * This method acts as a command handler for initiating a payment saga.
   *
   * @param {InitiatePaymentInput} paymentDetails - The details of the payment command from the GraphQL API.
   * @returns {Promise<string>} A promise that resolves with the unique workflow ID for tracking the payment process.
   */
  async initiatePayment(paymentDetails: InitiatePaymentInput): Promise<string> {
    const workflowId = `payment-${uuidv4()}`;
    this.logger.log(
      `Initiating payment workflow ${workflowId} for user ${paymentDetails.userId}.`,
    );

    // The workflow itself will emit granular events (debited, credited, failed).
    // This initial command starts that process.
    await this.temporalClient.workflow.start(paymentWorkflow, {
      taskQueue: 'transactions-queue',
      workflowId: workflowId,
      args: [{ ...paymentDetails, transactionId: workflowId }], // Pass the generated ID to the workflow
    });

    this.logger.log(`Payment workflow ${workflowId} started successfully.`);
    return workflowId;
  }

  // =============================================================================
  // QUERY-SIDE METHODS
  // These methods query the denormalized read model for efficient data retrieval.
  // =============================================================================

  /**
   * Finds a single transaction by its unique ID from the read model.
   *
   * @param {string} id - The unique identifier of the transaction.
   * @returns {Promise<Transaction | null>} The found transaction or null if it doesn't exist.
   */
  async findById(id: string): Promise<Transaction | null> {
    this.logger.debug(`Querying read model for transaction with ID: ${id}`);
    return this.transactionRepository.findOneBy({ id });
  }

  /**
   * Finds all transactions for a given user, with optional filtering, from the read model.
   *
   * @param {string} userId - The ID of the user whose transactions are being queried.
   * @param {TransactionFilterInput} [filter] - Optional filters for pagination and date range.
   * @returns {Promise<Transaction[]>} An array of transactions matching the query.
   */
  async findAllByUserId(userId: string, filter?: TransactionFilterInput): Promise<Transaction[]> {
    this.logger.debug(`Querying read model for transactions of user: ${userId}`);
    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction');

    queryBuilder.where('"transaction"."userId" = :userId', { userId });

    if (filter?.accountId) {
      queryBuilder.andWhere('"transaction"."accountId" = :accountId', { accountId: filter.accountId });
    }
    if (filter?.startDate) {
      queryBuilder.andWhere('"transaction"."date" >= :startDate', { startDate: filter.startDate });
    }
    if (filter?.endDate) {
      queryBuilder.andWhere('"transaction"."date" <= :endDate', { endDate: filter.endDate });
    }

    return queryBuilder
      .orderBy('"transaction"."date"', 'DESC')
      .skip(filter?.offset ?? 0)
      .take(filter?.limit ?? 100)
      .getMany();
  }

  // =============================================================================
  // READ MODEL PROJECTION METHODS
  // These methods are called by event handlers to update the read model.
  // =============================================================================

  /**
   * Updates the transaction read model with new transactions from an external source.
   * This method is called by the `handleTransactionsSynced` event handler.
   *
   * @param {NewTransactionsPayload} payload - The payload containing new transactions.
   * @returns {Promise<void>}
   */
  async updateReadModelWithNewTransactions(payload: NewTransactionsPayload): Promise<void> {
    const transactionEntities = payload.transactions.map((tx) =>
      this.transactionRepository.create({
        id: tx.transaction_id,
        userId: payload.userId,
        accountId: tx.account_id,
        amount: tx.amount,
        category: tx.category?.[0] ?? 'Uncategorized',
        categoryHierarchy: tx.category ?? [],
        date: tx.date,
        description: tx.name,
        merchantName: tx.merchant_name,
        isoCurrencyCode: tx.iso_currency_code,
        pending: tx.pending,
        type: tx.amount >= 0 ? 'INCOME' : 'EXPENSE',
      }),
    );

    // Use `save` with `chunk` option for better performance with large arrays.
    await this.transactionRepository.save(transactionEntities, { chunk: 100 });
    this.logger.log(`Upserted ${transactionEntities.length} transactions into the read model for user ${payload.userId}.`);
  }

  /**
   * Deletes all transactions associated with a specific account from the read model.
   * This is typically triggered when an account is unlinked.
   *
   * @param {string} userId - The ID of the user who owns the account.
   * @param {string} accountId - The ID of the account whose transactions should be deleted.
   * @returns {Promise<void>}
   */
  async deleteTransactionsFromReadModel(userId: string, accountId: string): Promise<void> {
    const deleteResult = await this.transactionRepository.delete({ userId, accountId });
    this.logger.log(
      `Deleted ${deleteResult.affected ?? 0} transactions from read model for account ${accountId}.`,
    );
  }
}
