/**
 * @file services/transactions-service/src/domain/events/transaction-created.event.ts
 * @description Defines the domain event for when a new transaction is created.
 *
 * This file is part of the domain layer and adheres to the principles of Domain-Driven Design (DDD)
 * and Event Sourcing. The TransactionCreatedEvent is an immutable fact that represents the
 * initiation of a new transaction in the system. It contains all the necessary information
 * to construct the initial state of a Transaction aggregate.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * @class TransactionCreatedEvent
 * @description A domain event that signifies the creation of a new financial transaction.
 * This is the first event in a transaction's lifecycle and serves as the source of truth
 * for its initial state.
 */
export class TransactionCreatedEvent {
  /**
   * @property A unique identifier for this specific event instance.
   * @type {string}
   */
  public readonly eventId: string;

  /**
   * @property The name of the event type. Used for routing and handling.
   * @type {string}
   */
  public readonly eventType = 'TransactionCreatedEvent';

  /**
   * @property The version of this event's schema.
   * @type {number}
   */
  public readonly eventVersion = 1;

  /**
   * @property The timestamp when the event occurred.
   * @type {Date}
   */
  public readonly occurredOn: Date;

  /**
   * @constructor
   * @param {string} aggregateId - The unique identifier for the transaction aggregate this event applies to.
   * @param {string} userId - The ID of the user who initiated the transaction.
   * @param {string} sourceAccountId - The ID of the account from which funds are being debited.
   * @param {string} destinationAccountId - The ID of the account to which funds are being credited.
   * @param {number} amount - The monetary value of the transaction.
   * @param {string} currency - The ISO 4217 currency code of the transaction.
   */
  constructor(
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly sourceAccountId: string,
    public readonly destinationAccountId: string,
    public readonly amount: number,
    public readonly currency: string,
  ) {
    this.eventId = uuidv4();
    this.occurredOn = new Date();
  }
}
