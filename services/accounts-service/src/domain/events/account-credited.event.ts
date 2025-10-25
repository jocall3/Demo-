/**
 * @file services/accounts-service/src/domain/events/account-credited.event.ts
 * @description This file defines the AccountCreditedEvent domain event. This event is created when a credit
 * (deposit) operation is successfully applied to an Account aggregate. It is an immutable fact that
 * represents a state change in the domain and serves as a source of truth for that change.
 * @adherencefor cqrs, event-sourcing, hexagonal-architecture
 */

/**
 * @class AccountCreditedEvent
 * @description Domain event representing the crediting of a financial account.
 * This event is immutable and is created by the Account aggregate when a credit
 * command is successfully processed. It is then persisted to the event store.
 * An implementation of a shared IDomainEvent interface is implied.
 */
export class AccountCreditedEvent {
  /**
   * The timestamp of when the event occurred.
   * @type {Date}
   * @readonly
   */
  public readonly occurredOn: Date;

  /**
   * Creates an instance of AccountCreditedEvent.
   * The use of public readonly properties in the constructor is a TypeScript shorthand
   * for declaring and initializing class members in one place.
   *
   * @param {string} aggregateId - The unique identifier of the account aggregate that was credited.
   * @param {number} amount - The amount that was credited to the account. Must be a positive value.
   * @param {string} transactionId - The unique identifier of the transaction that initiated this credit. This is crucial for idempotency and tracing.
   * @param {number} currentBalance - The balance of the account *after* the credit was applied. Storing the resulting state is useful for projectors and snapshots.
   */
  constructor(
    public readonly aggregateId: string,
    public readonly amount: number,
    public readonly transactionId: string,
    public readonly currentBalance: number,
  ) {
    this.occurredOn = new Date();
  }
}
