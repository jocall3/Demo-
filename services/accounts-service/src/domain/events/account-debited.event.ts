/**
 * @file services/accounts-service/src/domain/events/account-debited.event.ts
 * @description Defines the domain event for when an account is successfully debited.
 * This event is an immutable fact that represents a state change in the Account aggregate.
 * It is produced by the Account aggregate when processing a DebitAccountCommand and is
 * persisted to the event store (e.g., a Kafka topic) as part of the event sourcing pattern.
 */

/**
 * @class AccountDebitedEvent
 * @description A domain event indicating that a specific amount has been debited
 * from a financial account. This is an immutable data transfer object representing a fact
 * that has occurred in the past.
 * @implements IDomainEvent
 */
export class AccountDebitedEvent {
  /**
   * The name of the event. Used for event identification, serialization, and routing.
   * @public
   * @readonly
   * @type {string}
   */
  public readonly eventName = 'AccountDebitedEvent';

  /**
   * Creates an instance of AccountDebitedEvent.
   * @param {string} accountId The unique identifier of the account that was debited (Aggregate Root ID).
   * @param {number} amount The amount that was debited from the account. Must be a positive value.
   * @param {string} transactionId A unique identifier for the business transaction that caused this debit, used for correlation and idempotency.
   * @param {number} balanceAfterDebit The new balance of the account immediately after the debit was applied. This is crucial for rebuilding state from events.
   * @param {Date} timestamp The exact date and time when the debit occurred.
   */
  constructor(
    public readonly accountId: string,
    public readonly amount: number,
    public readonly transactionId: string,
    public readonly balanceAfterDebit: number,
    public readonly timestamp: Date,
  ) {
    // Ensure the amount is positive, as this represents the magnitude of the debit.
    if (amount <= 0) {
      throw new Error('Debit amount must be a positive number.');
    }
    // Freeze the object to ensure immutability, a core principle of domain events.
    Object.freeze(this);
  }
}
