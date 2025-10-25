import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// DOMAIN PRIMITIVES
// These abstract base classes align with Domain-Driven Design (DDD) and
// Event Sourcing principles.
// =============================================================================

/**
 * @abstract
 * @class AggregateRoot
 * @description A base class for all aggregate roots. It manages the aggregate's ID, version,
 * and a list of uncommitted domain events. This pattern is central to Event Sourcing,
 * ensuring that all state changes are captured as a sequence of immutable events.
 */
export abstract class AggregateRoot {
  /** The unique identifier of the aggregate. */
  public readonly id: string;

  /** The current version of the aggregate, incremented with each applied event. Used for optimistic concurrency control. */
  private _version = -1; // -1 indicates a new, un-persisted aggregate

  /** A list of domain events that have occurred but have not yet been committed to the event store. */
  private readonly _uncommittedEvents: DomainEvent[] = [];

  protected constructor(id: string) {
    this.id = id;
  }

  /**
   * Gets the current version of the aggregate.
   * @returns {number} The current version number.
   */
  public get version(): number {
    return this._version;
  }

  /**
   * Gets the list of uncommitted domain events.
   * @returns {readonly DomainEvent[]} A read-only array of uncommitted events.
   */
  public getUncommittedEvents(): readonly DomainEvent[] {
    return this._uncommittedEvents;
  }

  /**
   * Clears the list of uncommitted events. Called by the repository after persisting the events.
   */
  public markEventsAsCommitted(): void {
    this._uncommittedEvents.length = 0;
  }

  /**
   * Rehydrates the aggregate's state from a history of past events.
   * This method does not mark events as "new" or uncommitted.
   * @param {DomainEvent[]} history - An ordered array of domain events.
   */
  public loadFromHistory(history: DomainEvent[]): void {
    history.forEach((event) => this.apply(event, false));
  }

  /**
   * Applies an event to the aggregate. This is the core of event-driven state changes.
   * It mutates the aggregate's state via the `mutate` method and, if the event is new,
   * adds it to the list of uncommitted events.
   * @param {DomainEvent} event - The event to apply.
   * @param {boolean} [isNew=true] - A flag indicating if this is a new event (true) or one from history (false).
   */
  protected apply(event: DomainEvent, isNew = true): void {
    // Ensure the event is for this aggregate instance
    Object.defineProperty(event, 'aggregateId', { value: this.id });
    
    // Mutate state first
    this.mutate(event);
    
    // Then handle versioning and event tracking
    this._version++;
    if (isNew) {
      this._uncommittedEvents.push(event);
    }
  }

  /**
   * Abstract method that must be implemented by concrete aggregates. It defines
   * how the aggregate's state changes in response to a specific domain event. This method
   * should contain no business logic, only direct state assignments.
   * @param {DomainEvent} event - The event that is being applied.
   */
  protected abstract mutate(event: DomainEvent): void;
}

/**
 * @abstract
 * @class DomainEvent
 * @description The base class for all domain events. It represents an immutable fact
 * about something that has happened in the past within the domain.
 */
export abstract class DomainEvent {
  public readonly eventId: string = uuidv4();
  public readonly occurredOn: Date = new Date();
  public readonly aggregateId: string;
  public abstract readonly eventName: string;

  protected constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
  }
}

// =============================================================================
// VALUE OBJECTS
// Immutable objects that represent a descriptive aspect of the domain.
// =============================================================================

/**
 * @class Balance
 * @description A Value Object representing the financial balance of an account.
 * It encapsulates both the current (ledger) and available balances.
 */
export class Balance {
  private constructor(
    public readonly current: number,
    public readonly available: number,
    public readonly currency: string,
  ) {
    Object.freeze(this); // Ensure immutability
  }

  /**
   * Creates a new Balance instance.
   * @param {number} current - The current (ledger) balance.
   * @param {number} available - The available balance.
   * @param {string} currency - The ISO 4217 currency code.
   * @returns {Balance} A new, immutable Balance object.
   */
  public static create(current: number, available: number, currency: string): Balance {
    // Add any validation logic for a Balance here
    return new Balance(current, available, currency);
  }
}

// =============================================================================
// ACCOUNT DOMAIN EVENTS
// =============================================================================

export class AccountCreatedEvent extends DomainEvent {
  public readonly eventName = 'AccountCreated';
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly type: string,
    public readonly subtype: string | null,
    public readonly mask: string | null,
    public readonly institution: string,
    public readonly balance: { current: number; available: number; currency: string },
  ) {
    super(aggregateId);
  }
}

export class AccountCreditedEvent extends DomainEvent {
  public readonly eventName = 'AccountCredited';
  constructor(
    aggregateId: string,
    public readonly amount: number,
    public readonly newBalance: { current: number; available: number },
    public readonly transactionId: string,
  ) {
    super(aggregateId);
  }
}

export class AccountDebitedEvent extends DomainEvent {
  public readonly eventName = 'AccountDebited';
  constructor(
    aggregateId: string,
    public readonly amount: number,
    public readonly newBalance: { current: number; available: number },
    public readonly transactionId: string,
  ) {
    super(aggregateId);
  }
}

export class DebitFailedDueToInsufficientFundsEvent extends DomainEvent {
    public readonly eventName = 'DebitFailedDueToInsufficientFunds';
    constructor(
      aggregateId: string,
      public readonly attemptedAmount: number,
      public readonly transactionId: string,
    ) {
      super(aggregateId);
    }
}

export class AccountFrozenEvent extends DomainEvent {
    public readonly eventName = 'AccountFrozen';
    constructor(aggregateId: string, public readonly reason: string) {
      super(aggregateId);
    }
}

export class AccountUnfrozenEvent extends DomainEvent {
    public readonly eventName = 'AccountUnfrozen';
    constructor(aggregateId: string) {
      super(aggregateId);
    }
}

export class AccountClosedEvent extends DomainEvent {
    public readonly eventName = 'AccountClosed';
    constructor(aggregateId: string) {
      super(aggregateId);
    }
}


// =============================================================================
// ACCOUNT AGGREGATE ROOT
// =============================================================================

export type AccountStatus = 'OPEN' | 'FROZEN' | 'CLOSED';

/**
 * @class AccountAggregate
 * @extends AggregateRoot
 * @description The aggregate root for the Account bounded context. It enforces all
 * business rules (invariants) related to a financial account. All state changes
 * are modeled as a sequence of domain events.
 */
export class AccountAggregate extends AggregateRoot {
  // --- State ---
  private _userId: string;
  private _name: string;
  private _type: string;
  private _subtype: string | null;
  private _mask: string | null;
  private _institution: string;
  private _balance: Balance;
  private _status: AccountStatus;
  private _processedTransactionIds: Set<string> = new Set();

  private constructor(id: string) {
    super(id);
  }

  // --- Getters ---
  public get userId(): string { return this._userId; }
  public get balance(): Balance { return this._balance; }
  public get status(): AccountStatus { return this._status; }

  // --- Factory Methods ---

  /**
   * Factory method for creating a new account.
   * @returns {AccountAggregate} A new instance with an `AccountCreatedEvent`.
   */
  public static create(
    id: string,
    userId: string,
    name: string,
    type: string,
    subtype: string | null,
    mask: string | null,
    institution: string,
    initialBalance: Balance,
  ): AccountAggregate {
    const account = new AccountAggregate(id);
    account.apply(new AccountCreatedEvent(id, userId, name, type, subtype, mask, institution, initialBalance), true);
    return account;
  }

  /**
   * Factory method for rehydrating an account from its event history.
   * @param {string} id - The aggregate's ID.
   * @param {DomainEvent[]} history - The ordered sequence of domain events.
   * @returns {AccountAggregate} The rehydrated instance.
   */
  public static fromHistory(id: string, history: DomainEvent[]): AccountAggregate {
    const account = new AccountAggregate(id);
    account.loadFromHistory(history);
    return account;
  }

  // --- Command Methods (Public API of the Aggregate) ---

  /**
   * Credits the account with a given amount.
   * @param {number} amount - The positive amount to credit.
   * @param {string} transactionId - A unique ID for the transaction to ensure idempotency.
   * @throws {Error} If business invariants are violated.
   */
  public credit(amount: number, transactionId: string): void {
    this.assertNotClosed();
    if (amount <= 0) throw new Error('Credit amount must be positive.');
    if (this._processedTransactionIds.has(transactionId)) {
        this.logger.warn(`Idempotency check: Transaction ${transactionId} already processed.`);
        return; // Idempotent operation, do nothing.
    }

    const newBalance = Balance.create(this._balance.current + amount, this._balance.available + amount, this._balance.currency);
    this.apply(new AccountCreditedEvent(this.id, amount, newBalance, transactionId), true);
  }

  /**
   * Debits the account with a given amount.
   * @param {number} amount - The positive amount to debit.
   * @param {string} transactionId - A unique ID for the transaction to ensure idempotency.
   * @throws {Error} If business invariants are violated.
   */
  public debit(amount: number, transactionId: string): void {
    this.assertNotClosed();
    this.assertNotFrozen();
    if (amount <= 0) throw new Error('Debit amount must be positive.');
    if (this._processedTransactionIds.has(transactionId)) {
        this.logger.warn(`Idempotency check: Transaction ${transactionId} already processed.`);
        return;
    }
    if (this._balance.available < amount) {
      this.apply(new DebitFailedDueToInsufficientFundsEvent(this.id, amount, transactionId), true);
      throw new Error('Insufficient funds.');
    }
    
    const newBalance = Balance.create(this._balance.current - amount, this._balance.available - amount, this._balance.currency);
    this.apply(new AccountDebitedEvent(this.id, amount, newBalance, transactionId), true);
  }
  
  /**
   * Freezes the account, preventing debit operations.
   * @param {string} reason - The reason for freezing the account.
   */
  public freeze(reason: string): void {
    this.assertNotClosed();
    if (this._status === 'FROZEN') return; // Idempotent
    this.apply(new AccountFrozenEvent(this.id, reason), true);
  }

  /**
   * Unfreezes the account.
   */
  public unfreeze(): void {
    this.assertNotClosed();
    if (this._status !== 'FROZEN') return; // Idempotent
    this.apply(new AccountUnfrozenEvent(this.id), true);
  }
  
  /**
   * Closes the account.
   * @throws {Error} If the account has a non-zero balance.
   */
  public close(): void {
    if (this._balance.current !== 0) throw new Error('Cannot close an account with a non-zero balance.');
    if (this._status === 'CLOSED') return; // Idempotent
    this.apply(new AccountClosedEvent(this.id), true);
  }


  // --- State Mutation Logic ---

  /**
   * Routes events to their specific state-mutating methods.
   * @param {DomainEvent} event - The event to apply.
   */
  protected mutate(event: DomainEvent): void {
    if (event instanceof AccountCreatedEvent) this.onAccountCreated(event);
    else if (event instanceof AccountCreditedEvent) this.onAccountCredited(event);
    else if (event instanceof AccountDebitedEvent) this.onAccountDebited(event);
    else if (event instanceof AccountFrozenEvent) this.onAccountFrozen(event);
    else if (event instanceof AccountUnfrozenEvent) this.onAccountUnfrozen(event);
    else if (event instanceof AccountClosedEvent) this.onAccountClosed(event);
    // Failure events might not change state, but are recorded.
    else if (event instanceof DebitFailedDueToInsufficientFundsEvent) this.onDebitFailed(event);
  }

  private onAccountCreated(event: AccountCreatedEvent): void {
    this._userId = event.userId;
    this._name = event.name;
    this._type = event.type;
    this._subtype = event.subtype;
    this._mask = event.mask;
    this._institution = event.institution;
    this._balance = Balance.create(event.balance.current, event.balance.available, event.balance.currency);
    this._status = 'OPEN';
  }

  private onAccountCredited(event: AccountCreditedEvent): void {
    this._balance = Balance.create(event.newBalance.current, event.newBalance.available, this._balance.currency);
    this._processedTransactionIds.add(event.transactionId);
  }

  private onAccountDebited(event: AccountDebitedEvent): void {
    this._balance = Balance.create(event.newBalance.current, event.newBalance.available, this._balance.currency);
    this._processedTransactionIds.add(event.transactionId);
  }
  
  private onDebitFailed(event: DebitFailedDueToInsufficientFundsEvent): void {
      // No state change, but we record the attempt for idempotency.
      this._processedTransactionIds.add(event.transactionId);
  }

  private onAccountFrozen(event: AccountFrozenEvent): void {
    this._status = 'FROZEN';
  }

  private onAccountUnfrozen(event: AccountUnfrozenEvent): void {
    this._status = 'OPEN';
  }

  private onAccountClosed(event: AccountClosedEvent): void {
    this._status = 'CLOSED';
  }


  // --- Invariant Checks ---
  
  private assertNotClosed(): void {
    if (this._status === 'CLOSED') throw new Error('Operation not allowed on a closed account.');
  }

  private assertNotFrozen(): void {
    if (this._status === 'FROZEN') throw new Error('Operation not allowed on a frozen account.');
  }

  private get logger() {
      // A simple logger for domain-level warnings.
      return {
          warn: (message: string) => console.warn(`[AccountAggregate:${this.id}] ${message}`)
      }
  }
}
