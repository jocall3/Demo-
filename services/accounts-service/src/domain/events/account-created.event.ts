/**
 * @interface IDomainEvent
 * @description Represents the basic contract for a domain event within the system.
 * Domain events are immutable facts about something that has happened in the domain.
 * They are the single source of truth in an Event Sourcing pattern.
 */
export interface IDomainEvent {
  /**
   * The timestamp when the event occurred.
   * @type {Date}
   * @readonly
   */
  readonly occurredAt: Date;

  /**
   * Returns the unique identifier of the aggregate that this event belongs to.
   * This is used for routing events to the correct aggregate instance.
   * @returns {string} The aggregate ID.
   */
  getAggregateId(): string;
}

/**
 * @class AccountCreatedEvent
 * @implements {IDomainEvent}
 * @description A domain event that signifies the creation of a new financial account.
 * This event is the single source of truth for the initial state of an Account aggregate.
 * It is an immutable Data Transfer Object (DTO) once created.
 */
export class AccountCreatedEvent implements IDomainEvent {
  /**
   * The timestamp when the account creation event occurred.
   * @type {Date}
   * @readonly
   */
  public readonly occurredAt: Date;

  /**
   * The unique identifier for the newly created account aggregate.
   * This will be the aggregate root ID.
   * @type {string}
   * @readonly
   */
  public readonly accountId: string;

  /**
   * The ID of the user who owns this account.
   * @type {string}
   * @readonly
   */
  public readonly userId: string;

  /**
   * The initial name assigned to the account (e.g., "Primary Checking").
   * @type {string}
   * @readonly
   */
  public readonly name: string;

  /**
   * The type of the account.
   * @type {('CHECKING' | 'SAVINGS')}
   * @readonly
   */
  public readonly accountType: 'CHECKING' | 'SAVINGS';

  /**
   * The ISO 4217 currency code for the account's balance.
   * @type {('USD' | 'EUR' | 'GBP')}
   * @readonly
   */
  public readonly currency: 'USD' | 'EUR' | 'GBP';

  /**
   * The starting balance of the account at the time of creation.
   * @type {number}
   * @readonly
   */
  public readonly initialBalance: number;

  /**
   * @constructor
   * Creates an instance of AccountCreatedEvent.
   *
   * @param {string} accountId - The unique identifier for the newly created account aggregate.
   * @param {string} userId - The ID of the user who owns this account.
   * @param {string} name - The initial name assigned to the account.
   * @param {'CHECKING' | 'SAVINGS'} accountType - The type of the account.
   * @param {'USD' | 'EUR' | 'GBP'} currency - The ISO 4217 currency code.
   * @param {number} initialBalance - The starting balance of the account.
   */
  constructor(
    accountId: string,
    userId: string,
    name: string,
    accountType: 'CHECKING' | 'SAVINGS',
    currency: 'USD' | 'EUR' | 'GBP',
    initialBalance: number,
  ) {
    this.occurredAt = new Date();
    this.accountId = accountId;
    this.userId = userId;
    this.name = name;
    this.accountType = accountType;
    this.currency = currency;
    this.initialBalance = initialBalance;
  }

  /**
   * @method getAggregateId
   * @description Returns the unique identifier of the aggregate that this event pertains to.
   * @returns {string} The account ID.
   */
  public getAggregateId(): string {
    return this.accountId;
  }
}
