/**
 * @file This file contains the implementation of the Account Repository, acting as a persistence adapter
 * in a Hexagonal Architecture. It strictly adheres to CQRS and Event Sourcing principles.
 *
 * It implements two distinct ports (interfaces):
 * 1.  `IAccountEventStoreRepository` (Command-Side): Responsible for loading an `AccountAggregate`
 *     from its event history and saving it by appending new events to the event store (Kafka).
 * 2.  `IAccountReadRepository` (Query-Side): Responsible for querying a denormalized, optimized
 *     read model (a PostgreSQL table represented by the `AccountProjection` entity) for client-facing queries.
 */

import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

// =============================================================================
// PLACEHOLDER DEFINITIONS (for self-containment)
// In a real project, these would be in separate files under `src/application/ports`,
// `src/domain`, and `src/infrastructure`.
// =============================================================================

/**
 * @description Base class for all domain events. (Normally in `src/domain/events/domain-event.base.ts`)
 */
export abstract class DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/**
 * @description The Account aggregate root. (Normally in `src/domain/account.aggregate.ts`)
 */
export class AccountAggregate {
  public version = 0;
  private uncommittedEvents: DomainEvent[] = [];

  constructor(public readonly id: string) {}

  public getUncommittedEvents(): DomainEvent[] {
    return this.uncommittedEvents;
  }

  public markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  public loadFromHistory(history: DomainEvent[]): void {
    history.forEach((event) => this.apply(event, false));
  }

  protected apply(event: DomainEvent, isNew = true): void {
    // In a real implementation, a `switch(event.constructor.name)` would be used here
    // to call specific private `on[EventName]` methods to mutate the aggregate's state.
    // This is a simplified handler for demonstration.
    this.version++;
    if (isNew) {
      this.uncommittedEvents.push(event);
    }
  }
}

/**
 * @description Port for the command-side repository. (Normally in `src/application/ports/account-event-store.repository.port.ts`)
 */
export abstract class IAccountEventStoreRepository {
  abstract save(account: AccountAggregate): Promise<void>;
  abstract findById(accountId: string): Promise<AccountAggregate>;
}

/**
 * @description TypeORM entity for the read model projection. (Normally in `src/infrastructure/projections/account.projection.ts`)
 */
export class AccountProjection {
  id: string;
  userId: string;
  // other denormalized fields
}

/**
 * @description Port for the query-side repository. (Normally in `src/application/ports/account-read.repository.port.ts`)
 */
export abstract class IAccountReadRepository {
  abstract findProjectionById(accountId: string): Promise<AccountProjection | null>;
  abstract findProjectionsByUserId(userId: string): Promise<AccountProjection[]>;
}

/**
 * @description Injection token for the Kafka client. (Normally in `src/infrastructure/event-bus/kafka-client.token.ts`)
 */
export const KAFKA_CLIENT_TOKEN = 'KAFKA_CLIENT';

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

@Injectable()
export class AccountRepositoryAdapter
  implements IAccountEventStoreRepository, IAccountReadRepository
{
  private readonly logger = new Logger(AccountRepositoryAdapter.name);

  // This is a simplified, in-memory simulation of an event store for rehydration purposes.
  // In a production CQRS/ES system, this would be replaced by a dedicated Event Store database
  // (like EventStoreDB) or a sophisticated querying layer on top of Kafka with something like KSQL.
  private readonly eventStore: Map<string, DomainEvent[]> = new Map();

  constructor(
    @Inject(KAFKA_CLIENT_TOKEN) private readonly eventPublisher: ClientKafka,
    @InjectRepository(AccountProjection)
    private readonly readRepository: Repository<AccountProjection>,
  ) {}

  // =============================================================================
  // COMMAND-SIDE IMPLEMENTATION (IAccountEventStoreRepository)
  // Interacts with the event store (simulated + Kafka for publishing).
  // =============================================================================

  /**
   * Saves an `AccountAggregate` by publishing its uncommitted domain events to Kafka.
   * @param account - The `AccountAggregate` instance with pending changes.
   */
  async save(account: AccountAggregate): Promise<void> {
    const events = account.getUncommittedEvents();
    if (events.length === 0) {
      return;
    }

    this.logger.log(`Persisting ${events.length} event(s) for AccountAggregate [${account.id}]`);

    // In a real system, optimistic concurrency control would be handled here by checking the aggregate version against the event store.

    // 1. Publish each event to its corresponding Kafka topic.
    const eventPromises = events.map((event) => {
      // Topic name is derived from the event type for clear event-driven routing.
      const topic = `account.${event.constructor.name}`;
      this.logger.debug(`Publishing event to topic [${topic}]`, event);
      // The payload is the event itself. The key is the aggregate ID for partitioning.
      return firstValueFrom(this.eventPublisher.emit(topic, { key: account.id, value: event }));
    });

    await Promise.all(eventPromises);

    // 2. For our simulation, also append to the in-memory event store for `findById` to work.
    const currentEvents = this.eventStore.get(account.id) || [];
    this.eventStore.set(account.id, [...currentEvents, ...events]);

    // 3. Clear the uncommitted events from the aggregate.
    account.markEventsAsCommitted();
  }

  /**
   * Finds an `AccountAggregate` by rehydrating it from its full history of domain events.
   * @param accountId - The unique identifier of the account.
   * @returns The rehydrated `AccountAggregate` instance.
   * @throws {NotFoundException} if no events are found for the given ID.
   */
  async findById(accountId: string): Promise<AccountAggregate> {
    this.logger.log(`Rehydrating AccountAggregate from event store for ID [${accountId}]`);

    // This is the simulation part. A real implementation would query the event store (e.g., read a compacted Kafka topic).
    const events = this.eventStore.get(accountId);

    if (!events || events.length === 0) {
      this.logger.warn(`No events found for Account ID [${accountId}] in the event store.`);
      throw new NotFoundException(`Account with ID ${accountId} not found.`);
    }

    const account = new AccountAggregate(accountId);
    account.loadFromHistory(events);

    this.logger.log(`Successfully rehydrated AccountAggregate [${accountId}] to version ${account.version}`);
    return account;
  }

  // =============================================================================
  // QUERY-SIDE IMPLEMENTATION (IAccountReadRepository)
  // Interacts with the denormalized read model (PostgreSQL).
  // =============================================================================

  /**
   * Finds a single, denormalized account projection from the read model database.
   * @param accountId - The unique identifier of the account.
   * @returns The `AccountProjection` entity or null if not found.
   */
  async findProjectionById(accountId: string): Promise<AccountProjection | null> {
    this.logger.debug(`Querying read model for account projection by ID: ${accountId}`);
    return this.readRepository.findOneBy({ id: accountId });
  }

  /**
   * Finds all account projections for a given user from the read model database.
   * @param userId - The ID of the user.
   * @returns An array of `AccountProjection` entities.
   */
  async findProjectionsByUserId(userId: string): Promise<AccountProjection[]> {
    this.logger.debug(`Querying read model for account projections for user ID: ${userId}`);
    return this.readRepository.findBy({ userId });
  }
}
