/**
 * @fileoverview This file contains the Kafka adapter for publishing domain events.
 * It implements the `IEventPublisher` port, bridging the application's core logic
 * with the Kafka messaging infrastructure, aligning with Hexagonal Architecture and CQRS/ES patterns.
 */

import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { EVENT_BUS_CLIENT } from '../../../event-bus/event-bus.module';

// NOTE: The following interfaces (IDomainEvent, IEventPublisher) represent the "Port" in Hexagonal Architecture.
// In a complete file structure, they would reside in a dedicated port file, for example:
// `src/application/ports/event-publisher.port.ts`.

/**
 * @interface IDomainEvent
 * @description Defines the contract for any domain event within the system.
 * Domain events are immutable facts about something that has happened in the domain.
 * @template T - The type of the payload associated with the event.
 */
export interface IDomainEvent<T extends object = any> {
  /** The unique identifier of the aggregate that this event belongs to. */
  readonly aggregateId: string;
  /** The name of the event, used for routing and identification (e.g., 'account.created'). */
  readonly eventName: string;
  /** The timestamp when the event occurred. */
  readonly occurredOn: Date;
  /** The data payload of the event. */
  readonly payload: T;
}

/**
 * @description Injection token for the event publisher port.
 * This allows for dependency inversion, where the application core depends on this abstraction
 * rather than a concrete implementation.
 */
export const IEventPublisher = Symbol('IEventPublisher');

/**
 * @interface IEventPublisher
 * @description Defines the port for publishing domain events to the outside world (e.g., a message bus).
 * This abstraction decouples the core domain from the specific messaging technology.
 */
export interface IEventPublisher {
  /**
   * Publishes a single domain event.
   * @param {IDomainEvent} event - The domain event to publish.
   * @returns {Promise<void>}
   */
  publish(event: IDomainEvent): Promise<void>;

  /**
   * Publishes multiple domain events, ideally in a transactional manner.
   * @param {IDomainEvent[]} events - An array of domain events to publish.
   * @returns {Promise<void>}
   */
  publishAll(events: IDomainEvent[]): Promise<void>;
}

/**
 * @class KafkaEventsAdapter
 * @implements {IEventPublisher}
 * @implements {OnModuleInit}
 * @implements {OnModuleDestroy}
 * @description An infrastructure adapter that implements the `IEventPublisher` port.
 * It is responsible for publishing domain events from the `accounts-service` to the
 * central Kafka message bus, which acts as the Event Store in this CQRS/ES architecture.
 *
 * This adapter decouples the application's core domain from the specifics of Kafka,
 * adhering to the principles of Hexagonal Architecture.
 */
@Injectable()
export class KafkaEventsAdapter
  implements IEventPublisher, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaEventsAdapter.name);

  /**
   * @constructor
   * @param {ClientKafka} eventBusClient - The NestJS Kafka client proxy, injected via the `EVENT_BUS_CLIENT` token.
   */
  constructor(
    @Inject(EVENT_BUS_CLIENT) private readonly eventBusClient: ClientKafka,
  ) {}

  /**
   * @method onModuleInit
   * @description A NestJS lifecycle hook that connects the Kafka client when the module is initialized.
   * This ensures the publisher is ready to emit events as soon as the application starts.
   * @returns {Promise<void>}
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.eventBusClient.connect();
      this.logger.log('Successfully connected to Kafka for event publishing.');
    } catch (error) {
      this.logger.error(
        'Failed to connect to Kafka for event publishing.',
        error.stack,
      );
      // Depending on the application's requirements, you might want to exit the process
      // if a connection to the event bus cannot be established.
      process.exit(1);
    }
  }

  /**
   * @method onModuleDestroy
   * @description A NestJS lifecycle hook that gracefully closes the Kafka client connection
   * when the application is shutting down.
   * @returns {Promise<void>}
   */
  async onModuleDestroy(): Promise<void> {
    await this.eventBusClient.close();
    this.logger.log('Kafka client connection closed.');
  }

  /**
   * Publishes a single domain event to a Kafka topic.
   * The Kafka topic name is derived directly from the event's `eventName`.
   *
   * @param {IDomainEvent} event - The domain event to publish.
   * @returns {Promise<void>} A promise that resolves when the event has been sent.
   * @throws {Error} If publishing the event fails.
   */
  public async publish(event: IDomainEvent): Promise<void> {
    try {
      this.logger.debug(`Publishing event '${event.eventName}' to Kafka.`);
      // The `emit` method sends an event and returns an Observable.
      // We convert it to a Promise to be able to await its completion.
      await this.eventBusClient.emit(event.eventName, JSON.stringify(event)).toPromise();
      this.logger.log(
        `Event '${event.eventName}' for aggregate '${event.aggregateId}' successfully published.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event '${event.eventName}' for aggregate '${event.aggregateId}'.`,
        error.stack,
      );
      // Re-throw the error so the calling service (e.g., a command handler) can handle it,
      // for instance, by rolling back a transaction.
      throw new Error(`Failed to publish domain event: ${error.message}`);
    }
  }

  /**
   * Publishes an array of domain events.
   * This implementation iterates and publishes each event individually.
   * In a production system with higher throughput requirements, this might be
   * optimized to send events in a single batch request to Kafka if the client library supports it.
   *
   * @param {IDomainEvent[]} events - The array of domain events to publish.
   * @returns {Promise<void>} A promise that resolves when all events have been sent.
   */
  public async publishAll(events: IDomainEvent[]): Promise<void> {
    if (!events || events.length === 0) {
      return;
    }
    this.logger.debug(`Publishing a batch of ${events.length} events.`);
    // Promise.all ensures all events are sent concurrently.
    await Promise.all(events.map(event => this.publish(event)));
  }
}
