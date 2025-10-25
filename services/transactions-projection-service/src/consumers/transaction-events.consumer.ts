import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from '../schemas/transaction.schema';

// --- Event Payload DTOs ---
// These DTOs define the expected structure of events coming from the Kafka bus.
// In a real monorepo, these would likely live in a shared library.

/**
 * @interface TransactionEventPayload
 * @description The data structure for a transaction event from the write-side (transactions-service).
 * This represents a full transaction record.
 * @implements Required<Omit<Transaction, '__v' | 'createdAt' | 'updatedAt'>>
 */
interface TransactionEventPayload {
  /**
   * The unique identifier for the transaction.
   * @type {string}
   */
  id: string;

  /**
   * The ID of the user who owns the transaction.
   * @type {string}
   */
  userId: string;

  /**
   * The ID of the account the transaction belongs to.
   * @type {string}
   */
  accountId: string;

  /**
   * The type of transaction ('INCOME' or 'EXPENSE').
   * @type {'INCOME' | 'EXPENSE'}
   */
  type: 'INCOME' | 'EXPENSE';

  /**
   * A short description of the transaction (e.g., merchant name).
   * @type {string}
   */
  description: string;

  /**
   * The monetary value of the transaction.
   * @type {number}
   */
  amount: number;

  /**
   * The date the transaction was posted, in YYYY-MM-DD format.
   * @type {string}
   */
  date: string;

  /**
   * The primary spending category.
   * @type {string}
   */
  category: string;

  /**
   * The full category hierarchy.
   * @type {string[]}
   */
  categoryHierarchy: string[];

  /**
   * Indicates if the transaction is still pending.
   * @type {boolean}
   */
  pending: boolean;

  /**
   * The ISO-4217 currency code.
   * @type {string}
   */
  isoCurrencyCode: string;

  /**
   * Estimated carbon footprint in kg CO2.
   * @type {number | null}
   * @optional
   */
  carbonFootprint?: number | null;
}

/**
 * @interface TransactionDeletedEventPayload
 * @description The data structure for an event indicating a transaction was deleted.
 */
interface TransactionDeletedEventPayload {
  /**
   * The unique identifier of the transaction that was deleted.
   * @type {string}
   */
  id: string;
}

/**
 * @class TransactionEventsConsumer
 * @description A NestJS controller that acts as an event consumer for the Transactions Projection Service.
 * This is an "Inbound Adapter" in a Hexagonal Architecture. It subscribes to domain events
 * from Kafka topics (e.g., `transaction.created`, `transaction.updated`) and updates the
 * denormalized read model (projection) stored in MongoDB. This service is a core component
 * of the CQRS pattern, responsible for building the query side.
 */
@Controller()
export class TransactionEventsConsumer {
  /**
   * The logger instance for this controller.
   * @private
   * @readonly
   */
  private readonly logger = new Logger(TransactionEventsConsumer.name);

  /**
   * Creates an instance of TransactionEventsConsumer.
   * @param {Model<TransactionDocument>} transactionModel - The Mongoose model for the `Transaction` read model, injected by NestJS.
   */
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Handles the `transaction.created` event from the message bus.
   * It creates a new document in the MongoDB read model for the transaction.
   * The operation is idempotent, using `findByIdAndUpdate` with `upsert: true`.
   *
   * @param {TransactionEventPayload} payload The transaction data from the event.
   * @returns {Promise<void>}
   */
  @EventPattern('transaction.created')
  async handleTransactionCreated(@Payload() payload: TransactionEventPayload): Promise<void> {
    this.logger.log(`Received 'transaction.created' event for transaction ID: ${payload.id}`);
    try {
      // Using findByIdAndUpdate with upsert ensures idempotency. If the event is processed
      // more than once, it will simply update the existing document instead of creating a duplicate.
      const newProjection = await this.transactionModel.findByIdAndUpdate(
        payload.id,
        {
          _id: payload.id, // Explicitly set the document ID to match the domain model ID
          ...payload,
        },
        { upsert: true, new: true },
      );
      this.logger.log(`Successfully created or updated projection for transaction ID: ${newProjection._id}`);
    } catch (error) {
      this.logger.error(`Error processing 'transaction.created' event for transaction ID: ${payload.id}`, error.stack);
      // In a production system, this error would be routed to a dead-letter queue (DLQ)
      // for manual inspection and reprocessing.
    }
  }

  /**
   * Handles the `transaction.updated` event from the message bus.
   * It updates an existing document in the MongoDB read model.
   *
   * @param {Partial<TransactionEventPayload> & { id: string }} payload The partial transaction data to update, including the ID.
   * @returns {Promise<void>}
   */
  @EventPattern('transaction.updated')
  async handleTransactionUpdated(@Payload() payload: Partial<TransactionEventPayload> & { id: string }): Promise<void> {
    const { id, ...updateData } = payload;
    this.logger.log(`Received 'transaction.updated' event for transaction ID: ${id}`);
    try {
      const updatedProjection = await this.transactionModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true },
      );

      if (!updatedProjection) {
        this.logger.warn(`Could not find projection to update for transaction ID: ${id}. It may not have been created yet.`);
        // Optionally, you could queue this for retry or create it if it should exist.
        return;
      }

      this.logger.log(`Successfully updated projection for transaction ID: ${updatedProjection._id}`);
    } catch (error) {
      this.logger.error(`Error processing 'transaction.updated' event for transaction ID: ${id}`, error.stack);
    }
  }

  /**
   * Handles the `transaction.deleted` event from the message bus.
   * It removes a document from the MongoDB read model.
   *
   * @param {TransactionDeletedEventPayload} payload The payload containing the ID of the transaction to delete.
   * @returns {Promise<void>}
   */
  @EventPattern('transaction.deleted')
  async handleTransactionDeleted(@Payload() payload: TransactionDeletedEventPayload): Promise<void> {
    this.logger.log(`Received 'transaction.deleted' event for transaction ID: ${payload.id}`);
    try {
      const result = await this.transactionModel.findByIdAndDelete(payload.id);

      if (!result) {
        this.logger.warn(`Could not find projection to delete for transaction ID: ${payload.id}. It may have already been deleted.`);
        return;
      }

      this.logger.log(`Successfully deleted projection for transaction ID: ${payload.id}`);
    } catch (error) {
      this.logger.error(`Error processing 'transaction.deleted' event for transaction ID: ${payload.id}`, error.stack);
    }
  }
}
