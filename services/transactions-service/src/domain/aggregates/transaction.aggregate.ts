import { randomUUID } from 'crypto';

// =============================================================================
// BASE DOMAIN PRIMITIVES
// =============================================================================

/**
 * @class DomainEvent
 * @description Base class for all domain events. A domain event is an immutable
 * record of something that has happened in the past within the domain.
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;

  protected constructor(aggregateId: string) {
    this.eventId = randomUUID();
    this.occurredOn = new Date();
    this.aggregateId = aggregateId;
  }
}

/**
 * @class AggregateRoot
 * @description A base class for DDD aggregate roots. It encapsulates the logic for
 * tracking and dispatching domain events, which is central to Event Sourcing.
 */
export abstract class AggregateRoot {
  public readonly id: string;
  private _version = -1; // -1 indicates a new, unseen aggregate
  private readonly _uncommittedEvents: DomainEvent[] = [];

  protected constructor(id: string) {
    this.id = id;
  }

  public get version(): number {
    return this._version;
  }

  public get uncommittedEvents(): readonly DomainEvent[] {
    return this._uncommittedEvents;
  }

  public markEventsAsCommitted(): void {
    this._uncommittedEvents.length = 0;
  }

  protected apply(event: DomainEvent, isNew = false): void {
    this.mutate(event);
    if (isNew) {
      this._uncommittedEvents.push(event);
    }
    this._version++;
  }

  protected abstract mutate(event: DomainEvent): void;
}

// =============================================================================
// TRANSACTION DOMAIN-SPECIFIC TYPES AND EVENTS
// =============================================================================

export enum TransactionStatus {
  PENDING = 'PENDING',
  DEBIT_SUCCESSFUL = 'DEBIT_SUCCESSFUL',
  CREDIT_SUCCESSFUL = 'CREDIT_SUCCESSFUL',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUNDED = 'REFUNDED',
}

export class TransactionInitiatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly fromAccountId: string,
    public readonly toAccountId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly userId: string,
  ) {
    super(aggregateId);
  }
}

export class TransactionDebitConfirmedEvent extends DomainEvent {}

export class TransactionCreditConfirmedEvent extends DomainEvent {}

export class TransactionCompletedEvent extends DomainEvent {}

export class TransactionFailedEvent extends DomainEvent {
  constructor(aggregateId: string, public readonly reason: string) {
    super(aggregateId);
  }
}

export class TransactionRefundInitiatedEvent extends DomainEvent {}

export class TransactionRefundCompletedEvent extends DomainEvent {}

// =============================================================================
// TRANSACTION AGGREGATE ROOT
// =============================================================================

/**
 * @class TransactionAggregate
 * @description The aggregate root for the Transaction bounded context. It enforces
 * business rules (invariants) for a transaction's lifecycle and produces domain
 * events to record state changes. This is the heart of the command-side logic in a
 * CQRS/ES architecture.
 */
export class TransactionAggregate extends AggregateRoot {
  private _status: TransactionStatus;
  private _fromAccountId: string;
  private _toAccountId: string;
  private _amount: number;
  private _currency: string;
  private _userId: string;
  private _failureReason?: string;

  private constructor(id: string) {
    super(id);
  }

  // --- Getters for state ---
  public get status(): TransactionStatus {
    return this._status;
  }

  /**
   * @static
   * @method initiate
   * @description A factory method to create a new transaction. This is the entry point for a new transaction saga.
   * @returns {TransactionAggregate} The newly created aggregate instance with an uncommitted TransactionInitiatedEvent.
   */
  public static initiate(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    currency: string,
    userId: string,
  ): TransactionAggregate {
    if (amount <= 0) {
      throw new Error('Transaction amount must be positive.');
    }
    const id = randomUUID();
    const aggregate = new TransactionAggregate(id);
    const event = new TransactionInitiatedEvent(
      id,
      fromAccountId,
      toAccountId,
      amount,
      currency,
      userId,
    );
    aggregate.apply(event, true);
    return aggregate;
  }

  /**
   * @static
   * @method fromHistory
   * @description Rehydrates an aggregate instance from its history of domain events.
   * @param {string} id - The aggregate's ID.
   * @param {DomainEvent[]} history - The ordered list of events to apply.
   * @returns {TransactionAggregate} The rehydrated aggregate instance.
   */
  public static fromHistory(id: string, history: DomainEvent[]): TransactionAggregate {
    const aggregate = new TransactionAggregate(id);
    history.forEach((event) => aggregate.apply(event));
    return aggregate;
  }

  // --- Command Methods ---

  public confirmDebit(): void {
    if (this._status !== TransactionStatus.PENDING) {
      throw new Error('Cannot confirm debit on a transaction that is not pending.');
    }
    this.apply(new TransactionDebitConfirmedEvent(this.id), true);
  }

  public confirmCredit(): void {
    if (this._status !== TransactionStatus.DEBIT_SUCCESSFUL) {
      throw new Error('Cannot confirm credit before debit is successful.');
    }
    this.apply(new TransactionCreditConfirmedEvent(this.id), true);
  }

  public complete(): void {
    // In a simple transfer, credit confirmation implies completion
    if (this._status !== TransactionStatus.CREDIT_SUCCESSFUL) {
      throw new Error('Cannot complete transaction before credit is confirmed.');
    }
    this.apply(new TransactionCompletedEvent(this.id), true);
  }

  public fail(reason: string): void {
    if (this.isCompleteOrFailed()) {
      throw new Error('Cannot fail a transaction that is already completed or failed.');
    }
    this.apply(new TransactionFailedEvent(this.id, reason), true);
  }

  public initiateRefund(): void {
    if (this._status !== TransactionStatus.FAILED) {
      // This can be adjusted based on business rules, e.g., allow refund on completed transactions.
      throw new Error('Can only initiate a refund for a failed transaction.');
    }
    this.apply(new TransactionRefundInitiatedEvent(this.id), true);
  }

  public completeRefund(): void {
    if (this._status !== TransactionStatus.REFUND_INITIATED) {
      throw new Error('Cannot complete a refund that has not been initiated.');
    }
    this.apply(new TransactionRefundCompletedEvent(this.id), true);
  }

  // --- State Mutation ---

  /**
   * @private
   * @method mutate
   * @description The core of event sourcing within the aggregate. It applies the state change
   * from a given event to the aggregate's properties. This method should not contain any
   * business logic, only state transitions.
   */
  protected mutate(event: DomainEvent): void {
    if (event instanceof TransactionInitiatedEvent) {
      this._status = TransactionStatus.PENDING;
      this._fromAccountId = event.fromAccountId;
      this._toAccountId = event.toAccountId;
      this._amount = event.amount;
      this._currency = event.currency;
      this._userId = event.userId;
    } else if (event instanceof TransactionDebitConfirmedEvent) {
      this._status = TransactionStatus.DEBIT_SUCCESSFUL;
    } else if (event instanceof TransactionCreditConfirmedEvent) {
      this._status = TransactionStatus.CREDIT_SUCCESSFUL;
    } else if (event instanceof TransactionCompletedEvent) {
      this._status = TransactionStatus.COMPLETED;
    } else if (event instanceof TransactionFailedEvent) {
      this._status = TransactionStatus.FAILED;
      this._failureReason = event.reason;
    } else if (event instanceof TransactionRefundInitiatedEvent) {
      this._status = TransactionStatus.REFUND_INITIATED;
    } else if (event instanceof TransactionRefundCompletedEvent) {
      this._status = TransactionStatus.REFUNDED;
    }
  }

  private isCompleteOrFailed(): boolean {
    return [
      TransactionStatus.COMPLETED,
      TransactionStatus.FAILED,
      TransactionStatus.REFUNDED,
    ].includes(this._status);
  }
}
