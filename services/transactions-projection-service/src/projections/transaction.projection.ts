import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// --- Domain Event Interfaces (as consumed from Kafka) ---
// These would typically be in a shared library.

interface TransactionEventPayload {
  id: string;
  userId: string;
  accountId: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  date: string; // ISO 8601 string
  category: string;
  categoryHierarchy: string[];
  merchantName?: string;
  pending: boolean;
  isoCurrencyCode: string;
  carbonFootprint?: number;
}

interface TransactionCreatedEvent {
  transactionId: string;
  payload: TransactionEventPayload;
}

interface TransactionUpdatedEvent {
  transactionId: string;
  payload: Partial<TransactionEventPayload>; // Updates can be partial
}

interface TransactionRemovedEvent {
  transactionId: string;
  userId: string; // For scoping the deletion
}

// --- MongoDB Read Model Schema (Projection) ---

/**
 * @description Mongoose document interface for the Transaction read model.
 * It extends the base TransactionProjection class and Mongoose's Document.
 */
export type TransactionDocument = TransactionProjection & Document;

/**
 * @class TransactionProjection
 * @description Defines the denormalized read model for a transaction, stored in MongoDB.
 * This schema is optimized for fast queries by the GraphQL resolvers.
 * The `@Schema()` decorator marks this class as a Mongoose schema definition.
 */
@Schema({ timestamps: true, collection: 'transactions' })
export class TransactionProjection {
  /**
   * The unique identifier for the transaction, corresponding to the aggregate ID.
   */
  @Prop({ required: true, unique: true, index: true })
  _id: string; // Using _id for the primary key in MongoDB

  /**
   * The ID of the user who owns this transaction. Indexed for efficient user-based lookups.
   */
  @Prop({ required: true, index: true })
  userId: string;

  /**
   * The ID of the account this transaction belongs to. Indexed for efficient account-based lookups.
   */
  @Prop({ required: true, index: true })
  accountId: string;

  /**
   * The type of transaction (e.g., 'INCOME' or 'EXPENSE').
   */
  @Prop({ required: true, type: String, enum: ['INCOME', 'EXPENSE'] })
  type: 'INCOME' | 'EXPENSE';

  /**
   * A short description of the transaction (e.g., merchant name). Indexed for text search.
   */
  @Prop({ required: true, index: 'text' })
  description: string;

  /**
   * The monetary value of the transaction.
   */
  @Prop({ required: true })
  amount: number;

  /**
   * The date the transaction was posted, in ISO 8601 format. Indexed for date-range queries.
   */
  @Prop({ required: true, index: true })
  date: string;

  /**
   * The primary spending category of the transaction. Indexed for filtering.
   */
  @Prop({ required: true, index: true })
  category: string;

  /**
   * The full category hierarchy provided by the data source.
   */
  @Prop([String])
  categoryHierarchy: string[];

  /**
   * The specific merchant name, if available. Indexed for text search.
   */
  @Prop({ index: 'text' })
  merchantName?: string;

  /**
   * Indicates if the transaction is still pending or has been posted/settled.
   */
  @Prop({ required: true, default: false })
  pending: boolean;

  /**
   * The ISO-4217 currency code of the transaction.
   */
  @Prop({ required: true })
  isoCurrencyCode: string;

  /**
   * Estimated carbon footprint of the transaction in kg CO2.
   */
  @Prop()
  carbonFootprint?: number;
}

/**
 * The Mongoose schema object derived from the TransactionProjection class.
 */
export const TransactionSchema = SchemaFactory.createForClass(TransactionProjection);

// Add compound indexes for common query patterns
TransactionSchema.index({ userId: 1, date: -1 }); // For fetching a user's recent transactions
TransactionSchema.index({ accountId: 1, date: -1 }); // For fetching an account's recent transactions

// --- Projection Service (Event Handler) ---

/**
 * @class TransactionProjectionService
 * @description This service is responsible for updating the transaction read model (projection)
 * in response to domain events consumed from Kafka. It is a core component of the CQRS
 * "Query" side, ensuring the read database is kept up-to-date.
 */
@Injectable()
export class TransactionProjectionService {
  private readonly logger = new Logger(TransactionProjectionService.name);

  constructor(
    @InjectModel(TransactionProjection.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  /**
   * Handles the 'transaction.created' event. Creates a new transaction document
   * in the read model database (MongoDB). This operation is idempotent.
   *
   * @param {TransactionCreatedEvent} event - The event payload.
   */
  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    const { transactionId, payload } = event;
    this.logger.log(`Projecting TransactionCreatedEvent for ID: ${transactionId}`);
    try {
      // Use `updateOne` with `upsert: true` to make the operation idempotent.
      // If the event is processed multiple times, it will not create duplicate documents.
      await this.transactionModel.updateOne(
        { _id: transactionId },
        {
          _id: transactionId,
          ...payload,
        },
        { upsert: true },
      );
      this.logger.log(`Successfully created or updated projection for transaction ${transactionId}.`);
    } catch (error) {
      this.logger.error(`Error projecting TransactionCreatedEvent for ID ${transactionId}: ${error.message}`, error.stack);
      // In a production system, this would trigger an alert or a dead-letter queue mechanism.
      throw error;
    }
  }

  /**
   * Handles the 'transaction.updated' event. Updates an existing transaction document
   * in the read model with the new data from the event payload.
   *
   * @param {TransactionUpdatedEvent} event - The event payload.
   */
  async handleTransactionUpdated(event: TransactionUpdatedEvent): Promise<void> {
    const { transactionId, payload } = event;
    this.logger.log(`Projecting TransactionUpdatedEvent for ID: ${transactionId}`);
    try {
      const result = await this.transactionModel.updateOne(
        { _id: transactionId },
        { $set: payload },
      );

      if (result.matchedCount === 0) {
        this.logger.warn(`TransactionUpdatedEvent: No document found for ID ${transactionId}. A create event may have been missed.`);
        // Optionally, you could create the document here if that's the desired behavior.
      } else {
        this.logger.log(`Successfully updated projection for transaction ${transactionId}.`);
      }
    } catch (error) {
      this.logger.error(`Error projecting TransactionUpdatedEvent for ID ${transactionId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handles the 'transaction.removed' event. Deletes the corresponding transaction document
   * from the read model.
   *
   * @param {TransactionRemovedEvent} event - The event payload.
   */
  async handleTransactionRemoved(event: TransactionRemovedEvent): Promise<void> {
    const { transactionId, userId } = event;
    this.logger.log(`Projecting TransactionRemovedEvent for ID: ${transactionId}`);
    try {
      const result = await this.transactionModel.deleteOne({ _id: transactionId, userId }); // Include userId for security
      if (result.deletedCount === 0) {
        this.logger.warn(`TransactionRemovedEvent: No document found for ID ${transactionId} to delete.`);
      } else {
        this.logger.log(`Successfully deleted projection for transaction ${transactionId}.`);
      }
    } catch (error) {
      this.logger.error(`Error projecting TransactionRemovedEvent for ID ${transactionId}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
