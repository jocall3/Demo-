/**
 * @file event-publisher.port.ts
 * @description Defines the outbound port for publishing domain events.
 * @description In a Hexagonal Architecture, this port is the contract that the application
 * layer uses to send domain events to external infrastructure, such as a message bus (Kafka).
 * The concrete implementation (the adapter) will handle the actual publishing logic.
 */

/**
 * @interface DomainEvent
 * @description Represents a base contract for any domain event in the system.
 * Domain events are immutable facts about something that has happened in the past.
 * This aligns with the CQRS and Event Sourcing architectural pattern.
 * @template T The type of the event's payload.
 */
export interface DomainEvent<T = any> {
  /**
   * The unique identifier of the aggregate that generated the event.
   * @type {string}
   * @readonly
   */
  readonly aggregateId: string;

  /**
   * The type of the aggregate (e.g., 'AccountAggregate').
   * @type {string}
   * @readonly
   */
  readonly aggregateType: string;

  /**
   * The specific type of the event (e.g., 'AccountCreated').
   * @type {string}
   * @readonly
   */
  readonly eventType: string;

  /**
   * The data payload associated with the event.
   * @type {T}
   * @readonly
   */
  readonly payload: T;

  /**
   * The version of the aggregate after this event was applied.
   * Used for optimistic concurrency control and event ordering.
   * @type {number}
   * @readonly
   */
  readonly version: number;

  /**
   * The timestamp when the event occurred.
   * @type {Date}
   * @readonly
   */
  readonly timestamp: Date;

  /**
   * Optional metadata for tracing, correlation IDs, etc.
   * @type {Record<string, any>}
   * @readonly
   */
  readonly metadata?: Record<string, any>;
}

/**
 * @interface IEventPublisher
 * @description Defines the contract for an event publisher. The application core
 * depends on this interface to publish domain events without being coupled to a
 * specific messaging technology like Kafka or RabbitMQ.
 */
export interface IEventPublisher {
  /**
   * Publishes one or more domain events to the event bus.
   *
   * @param {DomainEvent[]} events - An array of domain events to be published.
   * @returns {Promise<void>} A promise that resolves when the events have been successfully sent.
   */
  publishAll(events: DomainEvent[]): Promise<void>;
}

/**
 * @const EVENT_PUBLISHER
 * @description A NestJS injection token for the IEventPublisher port.
 * This token is used to inject the event publisher adapter into the application services.
 *
 * @example
 * constructor(
 *   @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher
 * ) {}
 */
export const EVENT_PUBLISHER = Symbol('IEventPublisher');
