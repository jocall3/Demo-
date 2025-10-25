import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// DOMAIN EVENTS
// These are immutable facts about something that happened in the domain.
// =============================================================================

/**
 * @abstract
 * @class DomainEvent
 * @description The base class for all domain events. It contains common properties
 * that every event in the system should have.
 * @property {string} eventId - A unique identifier for this specific event instance.
 * @property {string} aggregateId - The ID of the aggregate that this event belongs to.
 * @property {Date} occurredOn - The timestamp when the event occurred.
 * @property {string} eventName - The name of the event, used for identification and deserialization.
 * @property {number} version - The version of the aggregate after this event was applied.
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly aggregateId: string;
  public readonly occurredOn: Date;
  public readonly eventName: string;
  public version: number;

  /**
   * @constructor
   * @param {string} aggregateId - The ID of the aggregate root.
   * @param {string} eventName - The name of the event.
   */
  protected constructor(aggregateId: string, eventName: string) {
    this.eventId = uuidv4();
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.eventName = eventName;
  }
}

/**
 * @class AccountCreatedEvent
 * @description Published when a new account is successfully created.
 */
export class AccountCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly userId: string,
    public readonly initialBalance: number,
    public readonly currency: string,
  ) {
    super(aggregateId, 'AccountCreatedEvent');
  }
}

/**
 * @class AccountCreditedEvent
 * @description Published when funds are successfully credited to an account.
 */
export class AccountCreditedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly amount: number,
    public readonly transactionId: string,
    public readonly newBalance: number,
  ) {
    super(aggregateId, 'AccountCreditedEvent');
  }
}

/**
 * @class AccountDebitedEvent
 * @description Published when funds are successfully debited from an account.
 */
export class AccountDebitedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly amount: number,
    public readonly transactionId: string,
    public readonly newBalance: number,
  ) {
    super(aggregateId, 'AccountDebitedEvent');
  }
}

/**
 * @class DebitFailedDueToInsufficientFundsEvent
 * @description Published when a debit operation fails because of insufficient funds.
 */
export class DebitFailedDueToInsufficientFundsEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly attemptedAmount: number,
    public readonly transactionId: string,
    public readonly currentBalance: number,
  ) {
    super(aggregateId, 'DebitFailedDueToInsufficientFundsEvent');
  }
}

/**
 * @class AccountFrozenEvent
 * @description Published when an account is frozen.
 */
export class AccountFrozenEvent extends DomainEvent {
  constructor(aggregateId: string, public readonly reason: string) {
    super(aggregateId, 'AccountFrozenEvent');
  }
}

/**
 * @class AccountUnfrozenEvent
 * @description Published when an account is unfrozen.
 */
export class AccountUnfrozenEvent extends DomainEvent {
  constructor(aggregateId: string) {
    super(aggregateId, 'AccountUnfrozenEvent');
  }
}

/**
 * @class AccountClosedEvent
 * @description Published when an account is closed.
 */
export class AccountClosedEvent extends DomainEvent {
  constructor(aggregateId: string, public readonly finalBalance: number) {
    super(aggregateId, 'AccountClosedEvent');
  }
}


// =============================================================================
// AGGREGATE ROOT
// =============================================================================

type AccountStatus = 'OPEN' | 'FROZEN' | 'CLOSED';

/**
 * @abstract
 * @class AggregateRoot
 * @description Base class for all aggregates. Manages the aggregate's ID, version,
 * and a list of uncommitted domain events.
 */
export abstract class AggregateRoot {
  public readonly id: string;
  private _version = 0;
  private _uncommittedEvents: DomainEvent[] = [];

  protected constructor(id: string) {
    this.id = id;
  }

  /**
   * @method getUncommittedEvents
   * @description Returns the list of events that have been applied to the aggregate but not yet persisted.
   * @returns {DomainEvent[]} An array of uncommitted domain events.
   */
  public getUncommittedEvents(): DomainEvent[] {
    return this._uncommittedEvents;
  }

  /**
   * @method markEventsAsCommitted
   * @description Clears the list of uncommitted events. This should be called by the repository
   * after successfully persisting the events.
   */
  public markEventsAsCommitted(): void {
    this._uncommittedEvents = [];
  }

  /**
   * @method getVersion
   * @description Gets the current version of the aggregate. The version is incremented for each event applied.
   * @returns {number} The current version.
   */
  public getVersion(): number {
    return this._version;
  }

  /**
   * @method apply
   * @description Applies a domain event to the aggregate. It calls the appropriate `on` method
   * to mutate the aggregate's state and adds the event to the list of uncommitted events.
   * @param {DomainEvent} event - The domain event to apply.
   * @param {boolean} isNew - Indicates if the event is a new event being created (true) or an event from history being replayed (false).
   */
  protected apply(event: DomainEvent, isNew = true): void {
    this.on(event);
    if (isNew) {
      this._uncommittedEvents.push(event);
    }
  }

  /**
   * @method _incrementVersion
   * @description Increments the aggregate's version number.
   */
  protected _incrementVersion(): void {
    this._version++;
  }

  /**
   * @method on
   * @description Abstract method that must be implemented by subclasses. It defines how the
   * aggregate's state is mutated in response to a specific domain event. This is the core
   * of event sourcing state changes.
   * @param {DomainEvent} event - The event that is being applied.
   */
  protected abstract on(event: DomainEvent): void;
}


/**
 * @class AccountAggregate
 * @extends AggregateRoot
 * @description Represents a single financial account. It is the aggregate root for the Account
 * bounded context and is responsible for enforcing all business rules (invariants) related to an account.
 * All state changes are driven by domain events.
 */
export class AccountAggregate extends AggregateRoot {
  private _userId: string;
  private _balance: number;
  private _currency: string;
  private _status: AccountStatus;

  /**
   * @private
   * @constructor
   * @description The constructor is private to enforce creation through factory methods.
   * @param {string} id - The unique identifier for the account.
   */
  private constructor(id: string) {
    super(id);
  }

  /**
   * @method create
   * @description Static factory method to create a new `AccountAggregate`.
   * @param {string} id - The account's unique ID.
   * @param {string} userId - The ID of the user who owns the account.
   * @param {number} initialBalance - The starting balance.
   * @param {string} currency - The ISO currency code.
   * @returns {AccountAggregate} A new instance of the account aggregate with an `AccountCreatedEvent` ready to be committed.
   */
  public static create(
    id: string,
    userId: string,
    initialBalance: number,
    currency: string,
  ): AccountAggregate {
    const account = new AccountAggregate(id);
    account.apply(new AccountCreatedEvent(id, userId, initialBalance, currency));
    return account;
  }

  /**
   * @method rehydrate
   * @description Static factory method to restore an aggregate's state from its history of events.
   * @param {string} id - The aggregate's ID.
   * @param {DomainEvent[]} events - The historical sequence of domain events.
   * @returns {AccountAggregate} An instance of the aggregate restored to its correct state.
   */
  public static rehydrate(id: string, events: DomainEvent[]): AccountAggregate {
    const account = new AccountAggregate(id);
    events.forEach((event) => account.apply(event, false));
    return account;
  }

  // --- Getters for state properties ---
  public get balance(): number { return this._balance; }
  public get userId(): string { return this._userId; }
  public get status(): AccountStatus { return this._status; }
  public get currency(): string { return this._currency; }


  // --- Command Methods (Public API of the Aggregate) ---

  /**
   * @method credit
   * @description Adds funds to the account.
   * @param {number} amount - The amount to credit. Must be a positive number.
   * @param {string} transactionId - The ID of the transaction causing this credit.
   * @throws {Error} If the amount is not positive or if the account is closed.
   */
  public credit(amount: number, transactionId: string): void {
    if (this._status === 'CLOSED') {
      throw new Error('Cannot credit a closed account.');
    }
    if (amount <= 0) {
      throw new Error('Credit amount must be positive.');
    }
    this.apply(
      new AccountCreditedEvent(
        this.id,
        amount,
        transactionId,
        this._balance + amount,
      ),
    );
  }

  /**
   * @method debit
   * @description Removes funds from the account.
   * @param {number} amount - The amount to debit. Must be a positive number.
   * @param {string} transactionId - The ID of the transaction causing this debit.
   * @throws {Error} If the amount is not positive, the account is closed or frozen, or funds are insufficient.
   */
  public debit(amount: number, transactionId: string): void {
    if (this._status === 'CLOSED') {
      throw new Error('Cannot debit a closed account.');
    }
    if (this._status === 'FROZEN') {
      throw new Error('Cannot debit a frozen account.');
    }
    if (amount <= 0) {
      throw new Error('Debit amount must be positive.');
    }
    if (this._balance < amount) {
      this.apply(
        new DebitFailedDueToInsufficientFundsEvent(
          this.id,
          amount,
          transactionId,
          this._balance,
        ),
      );
      // Even though this is a "failure" event, it is still a valid domain event that needs to be persisted.
      // We still throw an error to signal the command failed.
      throw new Error('Insufficient funds.');
    }
    this.apply(
      new AccountDebitedEvent(
        this.id,
        amount,
        transactionId,
        this._balance - amount,
      ),
    );
  }

  /**
   * @method freeze
   * @description Freezes the account, preventing debit transactions.
   * @param {string} reason - The reason for freezing the account.
   * @throws {Error} If the account is already frozen or closed.
   */
  public freeze(reason: string): void {
    if (this._status === 'FROZEN' || this._status === 'CLOSED') {
      throw new Error('Account is already frozen or closed.');
    }
    this.apply(new AccountFrozenEvent(this.id, reason));
  }

  /**
   * @method unfreeze
   * @description Unfreezes the account, re-enabling transactions.
   * @throws {Error} If the account is not currently frozen.
   */
  public unfreeze(): void {
    if (this._status !== 'FROZEN') {
      throw new Error('Account is not frozen.');
    }
    this.apply(new AccountUnfrozenEvent(this.id));
  }

  /**
   * @method close
   * @description Closes the account.
   * @throws {Error} If the account has a non-zero balance or is already closed.
   */
  public close(): void {
    if (this._balance !== 0) {
      throw new Error('Cannot close an account with a non-zero balance.');
    }
    if (this._status === 'CLOSED') {
      throw new Error('Account is already closed.');
    }
    this.apply(new AccountClosedEvent(this.id, this._balance));
  }

  // --- State Mutators (Private) ---

  /**
   * @protected
   * @method on
   * @description Routes an event to the appropriate state mutation method (`on<EventName>`).
   * This is the core of rehydrating the aggregate from its event stream.
   * @param {DomainEvent} event - The event to process.
   */
  protected on(event: DomainEvent): void {
    this._incrementVersion();
    event.version = this.getVersion();

    switch (event.eventName) {
      case 'AccountCreatedEvent':
        this.onAccountCreated(event as AccountCreatedEvent);
        break;
      case 'AccountCreditedEvent':
        this.onAccountCredited(event as AccountCreditedEvent);
        break;
      case 'AccountDebitedEvent':
        this.onAccountDebited(event as AccountDebitedEvent);
        break;
      case 'AccountFrozenEvent':
        this.onAccountFrozen(event as AccountFrozenEvent);
        break;
      case 'AccountUnfrozenEvent':
        this.onAccountUnfrozen(event as AccountUnfrozenEvent);
        break;
      case 'AccountClosedEvent':
        this.onAccountClosed(event as AccountClosedEvent);
        break;
      case 'DebitFailedDueToInsufficientFundsEvent':
        // No state change for a failed debit attempt.
        break;
      default:
        throw new Error(`Unknown event type: ${event.eventName}`);
    }
  }

  private onAccountCreated(event: AccountCreatedEvent): void {
    this._userId = event.userId;
    this._balance = event.initialBalance;
    this._currency = event.currency;
    this._status = 'OPEN';
  }

  private onAccountCredited(event: AccountCreditedEvent): void {
    this._balance = event.newBalance;
  }

  private onAccountDebited(event: AccountDebitedEvent): void {
    this._balance = event.newBalance;
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
}
