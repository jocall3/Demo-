import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../schemas/account.schema';

// --- Event Payload Interfaces ---
// These interfaces should mirror the domain events published by the accounts-service (command side).

interface BalancePayload {
  current: number;
  available: number | null;
  isoCurrencyCode: string | null;
}

/**
 * Payload for the 'account.created' event.
 */
interface AccountCreatedEventPayload {
  aggregateId: string; // This is the accountId
  userId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  institutionName: string;
  balance: BalancePayload;
  timestamp: string;
}

/**
 * Payload for balance update events like 'account.debited' or 'account.credited'.
 */
interface BalanceUpdatedEventPayload {
  aggregateId: string; // This is the accountId
  newBalance: {
    current: number;
    available: number | null;
  };
  transactionId: string;
  timestamp: string;
}

/**
 * @class AccountProjection
 * @description This controller is a projection that listens to domain events from the message bus (Kafka)
 * and builds a denormalized read model in a query-optimized database (MongoDB).
 * It is a core component of the "Query" side in a CQRS architecture.
 *
 * Each method decorated with `@EventPattern` is an event handler for a specific domain event.
 * These handlers are idempotent, meaning they can safely re-process the same event without
 * causing incorrect state (e.g., using `findOneAndUpdate` with `upsert: true`).
 */
@Controller()
export class AccountProjection {
  private readonly logger = new Logger(AccountProjection.name);

  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>,
  ) {}

  /**
   * Handles the 'account.created' event.
   * This creates a new document in the `accounts` collection in MongoDB.
   *
   * @param {AccountCreatedEventPayload} payload - The event data.
   */
  @EventPattern('account.created')
  async handleAccountCreated(@Payload() payload: AccountCreatedEventPayload): Promise<void> {
    this.logger.log(`Projecting 'account.created' event for accountId: ${payload.aggregateId}`);

    const newAccount = {
      _id: payload.aggregateId,
      userId: payload.userId,
      name: payload.name,
      mask: payload.mask,
      type: payload.type,
      subtype: payload.subtype,
      institutionName: payload.institutionName,
      balance: {
        current: payload.balance.current,
        available: payload.balance.available,
        isoCurrencyCode: payload.balance.isoCurrencyCode,
      },
      createdAt: new Date(payload.timestamp),
      updatedAt: new Date(payload.timestamp),
    };

    try {
      // Use findOneAndUpdate with upsert to ensure idempotency. If the event is replayed,
      // it will simply overwrite the existing document with the same initial data.
      await this.accountModel.findOneAndUpdate(
        { _id: payload.aggregateId },
        { $setOnInsert: newAccount }, // Only set these fields on initial insertion
        { upsert: true, new: true },
      );
      this.logger.log(`Successfully created/updated projection for account: ${payload.aggregateId}`);
    } catch (error) {
      this.logger.error(`Error projecting 'account.created' for accountId: ${payload.aggregateId}`, error.stack);
      // In production, failed projections would be handled by a DLQ or retry mechanism.
    }
  }

  /**
   * Handles 'account.balance.updated' events.
   * This updates the balance of an existing account document in the read model.
   *
   * @param {BalanceUpdatedEventPayload} payload - The event data containing the new balance.
   */
  @EventPattern('account.balance.updated') // A single topic for all balance changes
  async handleBalanceUpdated(@Payload() payload: BalanceUpdatedEventPayload): Promise<void> {
    this.logger.log(`Projecting 'account.balance.updated' event for accountId: ${payload.aggregateId}`);

    try {
      const result = await this.accountModel.findByIdAndUpdate(
        payload.aggregateId,
        {
          $set: {
            'balance.current': payload.newBalance.current,
            'balance.available': payload.newBalance.available,
            updatedAt: new Date(payload.timestamp),
          },
        },
        { new: true },
      );

      if (!result) {
        this.logger.warn(`Account with ID ${payload.aggregateId} not found in read model during balance update. Event may have arrived out of order.`);
        // This scenario could happen with out-of-order event processing. A more robust
        // system might retry or temporarily hold the event.
      } else {
        this.logger.log(`Successfully updated balance for account: ${payload.aggregateId}`);
      }
    } catch (error) {
      this.logger.error(`Error projecting 'account.balance.updated' for accountId: ${payload.aggregateId}`, error.stack);
    }
  }

  /**
   * Handles the 'account.details.updated' event.
   * This could be triggered by changes in account name, type, etc.
   *
   * @param payload - The event data with updated details.
   */
  @EventPattern('account.details.updated')
  async handleAccountDetailsUpdated(@Payload() payload: { aggregateId: string; name?: string; type?: string; subtype?: string; timestamp: string; }): Promise<void> {
    this.logger.log(`Projecting 'account.details.updated' for accountId: ${payload.aggregateId}`);

    const { aggregateId, timestamp, ...updates } = payload;
    
    // Construct the update object, ensuring no undefined fields are passed to MongoDB.
    const updateQuery: { $set: any } = { $set: { updatedAt: new Date(timestamp) } };
    for (const key in updates) {
      if (updates[key as keyof typeof updates] !== undefined) {
        updateQuery.$set[key as keyof typeof updates] = updates[key as keyof typeof updates];
      }
    }

    try {
      await this.accountModel.findByIdAndUpdate(aggregateId, updateQuery);
      this.logger.log(`Successfully updated details for account: ${payload.aggregateId}`);
    } catch (error) {
      this.logger.error(`Error projecting 'account.details.updated' for accountId: ${payload.aggregateId}`, error.stack);
    }
  }

  /**
   * Handles the 'account.removed' event.
   * This removes the account document from the read model collection.
   *
   * @param payload - The event data containing the account ID to remove.
   */
  @EventPattern('account.removed')
  async handleAccountRemoved(@Payload() payload: { aggregateId: string; timestamp: string; }): Promise<void> {
    this.logger.log(`Projecting 'account.removed' event for accountId: ${payload.aggregateId}`);

    try {
      const result = await this.accountModel.findByIdAndDelete(payload.aggregateId);
      if (result) {
        this.logger.log(`Successfully removed projection for account: ${payload.aggregateId}`);
      } else {
        this.logger.warn(`Attempted to remove account ${payload.aggregateId}, but it was not found in the read model.`);
      }
    } catch (error) {
      this.logger.error(`Error projecting 'account.removed' for accountId: ${payload.aggregateId}`, error.stack);
    }
  }
}
