import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountProjection, AccountProjectionDocument } from '../schemas/account.schema';

// --- DTOs for Kafka Event Payloads ---
// These interfaces define the contract for events coming from the 'accounts-service' command side.

interface AccountCreatedEventPayload {
  aggregateId: string; // This is the accountId
  userId: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  institutionName: string;
  balance: {
    current: number;
    available: number | null;
    isoCurrencyCode: string | null;
  };
  timestamp: string;
}

interface AccountBalanceUpdatedEventPayload {
  aggregateId: string; // accountId
  balance: {
    current: number;
    available: number | null;
  };
  timestamp: string;
}

interface AccountClosedEventPayload {
  aggregateId: string; // accountId
  reason: string;
  timestamp: string;
}


/**
 * @class AccountEventsConsumer
 * @description An inbound adapter in a Hexagonal Architecture. This controller acts as a Kafka consumer,
 * listening to domain events emitted by the `accounts-service` (the command side).
 * It is responsible for building and maintaining the denormalized read model (projection)
 * of accounts, which is stored in a separate query-optimized database (MongoDB).
 * This class is a core component of the Query side in a CQRS and Event Sourcing pattern.
 */
@Controller()
export class AccountEventsConsumer {
  private readonly logger = new Logger(AccountEventsConsumer.name);

  /**
   * @constructor
   * @param {Model<AccountProjectionDocument>} accountProjectionModel - Injected Mongoose model for the 'account_projections' collection.
   */
  constructor(
    @InjectModel(AccountProjection.name)
    private readonly accountProjectionModel: Model<AccountProjectionDocument>,
  ) {}

  /**
   * @method handleAccountCreated
   * @description Handles the 'account.created' event. Creates a new document in the
   * account projections collection. This operation is idempotent.
   * @param {AccountCreatedEventPayload} event - The payload of the 'account.created' event.
   */
  @EventPattern('account.created')
  async handleAccountCreated(@Payload() event: AccountCreatedEventPayload): Promise<void> {
    this.logger.log(`Received 'account.created' event for accountId: ${event.aggregateId}`);
    try {
      // Using updateOne with upsert ensures idempotency. If the event is processed
      // more than once, it will not create duplicate documents.
      await this.accountProjectionModel.updateOne(
        { _id: event.aggregateId },
        {
          $setOnInsert: {
            _id: event.aggregateId,
            userId: event.userId,
            name: event.name,
            mask: event.mask,
            type: event.type,
            subtype: event.subtype,
            institutionName: event.institutionName,
            balanceCurrent: event.balance.current,
            balanceAvailable: event.balance.available,
            currency: event.balance.isoCurrencyCode,
            status: 'ACTIVE',
            createdAt: new Date(event.timestamp),
          },
          $set: {
            updatedAt: new Date(event.timestamp),
          }
        },
        { upsert: true },
      );
      this.logger.log(`Projection for accountId: ${event.aggregateId} created/updated.`);
    } catch (error) {
      this.logger.error(`Failed to process 'account.created' event for accountId: ${event.aggregateId}`, error.stack);
      // In a production system, this would trigger an alert and potentially push the message to a DLQ.
    }
  }

  /**
   * @method handleAccountBalanceUpdated
   * @description Handles the 'account.balance.updated' event. Updates the balance fields of an
   * existing account document in the projections collection.
   * @param {AccountBalanceUpdatedEventPayload} event - The payload of the 'account.balance.updated' event.
   */
  @EventPattern('account.balance.updated')
  async handleAccountBalanceUpdated(@Payload() event: AccountBalanceUpdatedEventPayload): Promise<void> {
    this.logger.log(`Received 'account.balance.updated' event for accountId: ${event.aggregateId}`);
    try {
      const result = await this.accountProjectionModel.updateOne(
        { _id: event.aggregateId },
        {
          $set: {
            balanceCurrent: event.balance.current,
            balanceAvailable: event.balance.available,
            updatedAt: new Date(event.timestamp),
          },
        },
      );
      if (result.matchedCount === 0) {
        this.logger.warn(`'account.balance.updated' event received for non-existent accountId: ${event.aggregateId}. The 'account.created' event might have been missed or is delayed.`);
      } else {
        this.logger.log(`Balance updated for accountId: ${event.aggregateId}.`);
      }
    } catch (error) {
      this.logger.error(`Failed to process 'account.balance.updated' event for accountId: ${event.aggregateId}`, error.stack);
    }
  }

  /**
   * @method handleAccountClosed
   * @description Handles the 'account.closed' event. Updates the status of an existing
   * account document to 'CLOSED'.
   * @param {AccountClosedEventPayload} event - The payload of the 'account.closed' event.
   */
  @EventPattern('account.closed')
  async handleAccountClosed(@Payload() event: AccountClosedEventPayload): Promise<void> {
    this.logger.log(`Received 'account.closed' event for accountId: ${event.aggregateId}`);
    try {
      const result = await this.accountProjectionModel.updateOne(
        { _id: event.aggregateId },
        {
          $set: {
            status: 'CLOSED',
            updatedAt: new Date(event.timestamp),
          },
        },
      );
       if (result.matchedCount === 0) {
        this.logger.warn(`'account.closed' event received for non-existent accountId: ${event.aggregateId}.`);
      } else {
        this.logger.log(`Status set to CLOSED for accountId: ${event.aggregateId}.`);
      }
    } catch (error) {
      this.logger.error(`Failed to process 'account.closed' event for accountId: ${event.aggregateId}`, error.stack);
    }
  }
}
