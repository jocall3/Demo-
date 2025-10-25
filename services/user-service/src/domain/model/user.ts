/**
 * @file This file defines the core User domain model as an Aggregate Root, along with its associated Domain Events.
 * This implementation adheres to Domain-Driven Design (DDD) and Event Sourcing principles, which are central
 * to the new microservices architecture. The User aggregate encapsulates all business logic and state transitions
 * for a user profile, ensuring consistency and providing a full audit trail of changes.
 *
 * As per the architectural directive for a centralized Domain Modeling Language (DML), this TypeScript code
 * serves as the generated artifact from such a DML. It is a pure domain model with no dependencies on
 * external frameworks or infrastructure.
 *
 * @see ADR-0003: Implement a Full CQRS and Event Sourcing Pattern
 * @see ADR-0005: Mandate Hexagonal Architecture (Ports and Adapters)
 */

import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// BASE DOMAIN PRIMITIVES (Would be in a shared domain library)
// =============================================================================

/**
 * @abstract
 * @class DomainEvent
 * @description The base class for all domain events. It represents an immutable fact about something that has happened in the domain.
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

  protected constructor(aggregateId: string, eventName: string) {
    this.eventId = uuidv4();
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.eventName = eventName;
  }
}

/**
 * @abstract
 * @class AggregateRoot
 * @description Base class for all aggregates. Manages the aggregate's ID, version,
 * and a list of uncommitted domain events, forming the core of an Event Sourced entity.
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

  public getUncommittedEvents(): readonly DomainEvent[] {
    return this._uncommittedEvents;
  }

  public markEventsAsCommitted(): void {
    this._uncommittedEvents.length = 0;
  }

  public loadFromHistory(history: DomainEvent[]): void {
    history.forEach((event) => this.apply(event, false));
  }

  protected apply(event: DomainEvent, isNew = true): void {
    // Mutate the state first
    this.mutate(event);
    // Then, if it's a new event, add it to the uncommitted list
    if (isNew) {
      this._uncommittedEvents.push(event);
    }
    this._version++;
    event.version = this.version;
  }

  protected abstract mutate(event: DomainEvent): void;
}

// =============================================================================
// USER DOMAIN EVENTS
// =============================================================================

export class UserCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly authId: string,
    public readonly email: string,
    public readonly name: string,
  ) {
    super(aggregateId, 'UserCreatedEvent');
  }
}

export class UserProfileUpdatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly updates: { name?: string; title?: string | null; avatarUrl?: string | null },
  ) {
    super(aggregateId, 'UserProfileUpdatedEvent');
  }
}

export class UserDeactivatedEvent extends DomainEvent {
  constructor(aggregateId: string, public readonly reason: string) {
    super(aggregateId, 'UserDeactivatedEvent');
  }
}

export class UserReactivatedEvent extends DomainEvent {
  constructor(aggregateId: string) {
    super(aggregateId, 'UserReactivatedEvent');
  }
}

// =============================================================================
// USER AGGREGATE ROOT
// =============================================================================

type UserStatus = 'ACTIVE' | 'DEACTIVATED';

/**
 * @class User
 * @extends AggregateRoot
 * @description The aggregate root for the User bounded context. It encapsulates the state
 * and business rules for a user's profile, ensuring all state changes are valid and consistent
 * by emitting domain events.
 */
export class User extends AggregateRoot {
  private _authId: string;
  private _email: string;
  private _name: string;
  private _title: string | null;
  private _avatarUrl: string | null;
  private _status: UserStatus;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(id: string) {
    super(id);
  }

  // --- Factory Methods for Aggregate Creation ---

  /**
   * @static
   * @method create
   * @description Factory method for creating a new `User` aggregate.
   * @param {string} authId - The unique identifier from the external authentication provider.
   * @param {string} email - The user's email address.
   * @param {string} name - The user's full name.
   * @returns {User} A new instance of the User aggregate with a `UserCreatedEvent`.
   */
  public static create(authId: string, email: string, name: string): User {
    const user = new User(uuidv4());
    user.apply(new UserCreatedEvent(user.id, authId, email, name), true);
    return user;
  }

  /**
   * @static
   * @method fromHistory
   * @description Factory method to rehydrate a `User` aggregate from its event history.
   * @param {string} id - The aggregate's unique ID.
   * @param {DomainEvent[]} history - The ordered sequence of domain events.
   * @returns {User} A user instance restored to its correct state.
   */
  public static fromHistory(id: string, history: DomainEvent[]): User {
    const user = new User(id);
    user.loadFromHistory(history);
    return user;
  }

  // --- Command Methods (Public Business Logic) ---

  /**
   * @method updateProfile
   * @description Updates the user's profile information. This method validates the input
   * and applies a `UserProfileUpdatedEvent` if there are changes.
   * @param {object} data - An object containing the fields to update.
   */
  public updateProfile(data: { name?: string; title?: string | null; avatarUrl?: string | null }): void {
    if (this._status === 'DEACTIVATED') {
      throw new Error('Cannot update the profile of a deactivated user.');
    }

    const updates: { name?: string; title?: string | null; avatarUrl?: string | null } = {};

    if (data.name && data.name.trim() !== '' && data.name !== this._name) {
      updates.name = data.name;
    }
    if (data.title !== undefined && data.title !== this._title) {
      updates.title = data.title;
    }
    if (data.avatarUrl !== undefined && data.avatarUrl !== this._avatarUrl) {
      updates.avatarUrl = data.avatarUrl;
    }

    if (Object.keys(updates).length > 0) {
      this.apply(new UserProfileUpdatedEvent(this.id, updates), true);
    }
  }

  /**
   * @method deactivate
   * @description Deactivates the user's account.
   * @param {string} reason - The reason for deactivation.
   */
  public deactivate(reason: string): void {
    if (this._status === 'DEACTIVATED') {
      return; // Idempotent
    }
    this.apply(new UserDeactivatedEvent(this.id, reason), true);
  }

  // --- State Mutators (Event Handlers) ---

  /**
   * @protected
   * @method mutate
   * @description Routes an event to the appropriate `on[EventName]` method to mutate the aggregate's state.
   * This method should not contain any business logic, only state transitions.
   * @param {DomainEvent} event - The domain event to apply.
   */
  protected mutate(event: DomainEvent): void {
    if (event instanceof UserCreatedEvent) {
      this.onUserCreated(event);
    } else if (event instanceof UserProfileUpdatedEvent) {
      this.onUserProfileUpdated(event);
    } else if (event instanceof UserDeactivatedEvent) {
      this.onUserDeactivated(event);
    } else if (event instanceof UserReactivatedEvent) {
      this.onUserReactivated(event);
    }
  }

  private onUserCreated(event: UserCreatedEvent): void {
    this._authId = event.authId;
    this._email = event.email;
    this._name = event.name;
    this._status = 'ACTIVE';
    this._title = null;
    this._avatarUrl = null;
    this._createdAt = event.occurredOn;
    this._updatedAt = event.occurredOn;
  }

  private onUserProfileUpdated(event: UserProfileUpdatedEvent): void {
    if (event.updates.name) this._name = event.updates.name;
    if (event.updates.title !== undefined) this._title = event.updates.title;
    if (event.updates.avatarUrl !== undefined) this._avatarUrl = event.updates.avatarUrl;
    this._updatedAt = event.occurredOn;
  }

  private onUserDeactivated(event: UserDeactivatedEvent): void {
    this._status = 'DEACTIVATED';
    this._updatedAt = event.occurredOn;
  }

  private onUserReactivated(event: UserReactivatedEvent): void {
    this._status = 'ACTIVE';
    this._updatedAt = event.occurredOn;
  }
}
