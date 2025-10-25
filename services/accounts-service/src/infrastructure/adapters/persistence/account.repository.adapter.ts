/**
 * @file services/accounts-service/src/infrastructure/adapters/persistence/account.repository.adapter.ts
 * @description This file contains the implementation of the Account Repository, acting as a persistence adapter
 * in a Hexagonal Architecture. It has been refactored to implement the "Multi-Tier (L1/L2) Caching Strategy".
 *
 * It implements the `AccountRepositoryPort` and adheres to CQRS principles:
 * 1.  **Command-Side**: It handles persistence for the `AccountAggregate` by publishing its domain events.
 *     This is part of an Event Sourcing pattern. It also performs write-through cache invalidation.
 * 2.  **Query-Side**: It provides access to a denormalized read model (`AccountProjection`) and implements
 *     a multi-tier (L1 in-memory, L2 distributed) read-through caching strategy to optimize performance.
 */

import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import NodeCache from 'node-cache';

import { AccountRepositoryPort } from '../../../application/ports/out/account.repository.port';
import { IEventPublisher, EVENT_PUBLISHER } from '../../../application/ports/out/event-publisher.port';
import { AccountAggregate } from '../../../domain/aggregates/account.aggregate';
import { AccountReadModel } from '../../../application/queries/read-models/account.read-model';
import { AccountProjection } from '../../projections/account.projection';

@Injectable()
export class AccountRepositoryAdapter implements AccountRepositoryPort {
  private readonly logger = new Logger(AccountRepositoryAdapter.name);

  /**
   * L1 Cache: A short-lived, in-memory cache for ultra-low latency access to hot data.
   * @private
   */
  private readonly l1Cache: NodeCache;

  /**
   * @constructor
   * @param {Cache} l2Cache - L2 Cache: The distributed cache (Redis), injected via NestJS's `CacheModule`.
   * @param {IEventPublisher} eventPublisher - The port for publishing domain events to the message bus (Kafka).
   * @param {Repository<AccountProjection>} readModelRepository - The TypeORM repository for the denormalized read model.
   */
  constructor(
    @Inject(CACHE_MANAGER) private readonly l2Cache: Cache, // L2 distributed cache
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @InjectRepository(AccountProjection)
    private readonly readModelRepository: Repository<AccountProjection>,
  ) {
    // Initialize L1 cache with a 30-second TTL and a 60-second check period.
    this.l1Cache = new NodeCache({ stdTTL: 30, checkperiod: 60 });
    this.logger.log('AccountRepositoryAdapter initialized with L1/L2 caching strategy.');
  }

  // =============================================================================
  // COMMAND-SIDE (WRITE MODEL) METHODS
  // =============================================================================

  /**
   * Persists an `AccountAggregate` by publishing its uncommitted events and invalidating caches.
   * This implements a write-through caching strategy (via invalidation).
   *
   * @param {AccountAggregate} account - The account aggregate instance with uncommitted domain events.
   * @returns {Promise<void>}
   */
  async save(account: AccountAggregate): Promise<void> {
    const events = account.getUncommittedEvents();
    if (events.length === 0) {
      return;
    }

    // 1. Publish new events to the event bus (e.g., Kafka).
    await this.eventPublisher.publishAll(events);
    account.markEventsAsCommitted();
    this.logger.log(`Published ${events.length} event(s) for aggregate ${account.id}.`);

    // 2. Invalidate caches for the corresponding read model.
    const cacheKey = `account_projection:${account.id}`;
    this.l1Cache.del(cacheKey);
    await this.l2Cache.del(cacheKey);
    this.logger.debug(`Invalidated L1/L2 cache for key: ${cacheKey}`);

    // Also invalidate the user's list of accounts, as it has changed.
    const userCacheKey = `user_accounts:${account.userId}`;
    this.l1Cache.del(userCacheKey);
    await this.l2Cache.del(userCacheKey);
    this.logger.debug(`Invalidated L1/L2 cache for user accounts list: ${userCacheKey}`);
  }

  /**
   * Retrieves an `AccountAggregate` by rehydrating it from its event history.
   * NOTE: This is a placeholder. A true Event Sourcing implementation would require an Event Store
   * client to fetch all events for the given aggregateId and replay them.
   *
   * @param {string} id - The unique ID of the account aggregate.
   * @returns {Promise<AccountAggregate | null>} The rehydrated aggregate or null.
   */
  async findById(id: string): Promise<AccountAggregate | null> {
    this.logger.warn(`[SIMULATION] findById for aggregate ${id} should rehydrate from event store. Returning a new instance for demo purposes.`);
    // In a real system:
    // const events = await this.eventStoreClient.getEventsForAggregate(id);
    // if (!events || events.length === 0) return null;
    // return AccountAggregate.rehydrate(id, events);
    return new AccountAggregate(id); // Placeholder for demonstration
  }

  // =============================================================================
  // QUERY-SIDE (READ MODEL) METHODS
  // =============================================================================

  /**
   * Retrieves a denormalized `AccountReadModel` by its ID, using a multi-tier cache.
   * This implements the read-through caching pattern.
   *
   * @param {string} id - The unique identifier of the account.
   * @returns {Promise<AccountReadModel | null>} The account read model or null if not found.
   */
  async findProjectionById(id: string): Promise<AccountReadModel | null> {
    const cacheKey = `account_projection:${id}`;

    // 1. Check L1 (in-memory) Cache
    const l1Cached = this.l1Cache.get<AccountReadModel>(cacheKey);
    if (l1Cached) {
      this.logger.debug(`[CACHE HIT] L1 for key: ${cacheKey}`);
      return l1Cached;
    }

    // 2. Check L2 (distributed) Cache
    const l2Cached = await this.l2Cache.get<AccountReadModel>(cacheKey);
    if (l2Cached) {
      this.logger.debug(`[CACHE HIT] L2 for key: ${cacheKey}`);
      this.l1Cache.set(cacheKey, l2Cached);
      return l2Cached;
    }

    // 3. Cache Miss: Fetch from the read model database
    this.logger.debug(`[CACHE MISS] L1/L2 for key: ${cacheKey}. Fetching from DB.`);
    const account = await this.readModelRepository.findOneBy({ id });

    if (account) {
      // 4. Populate caches with the database result.
      const l2CacheTtlMs = 3600 * 1000; // 1 hour for L2 cache
      await this.l2Cache.set(cacheKey, account, l2CacheTtlMs);
      this.l1Cache.set(cacheKey, account);
      this.logger.debug(`[CACHE SET] L1/L2 populated for key: ${cacheKey}`);
    }

    return account;
  }

  /**
   * Retrieves all account read models for a given user, using a multi-tier cache.
   *
   * @param {string} userId - The ID of the user whose accounts are to be retrieved.
   * @returns {Promise<AccountReadModel[]>} An array of account read models.
   */
  async findProjectionsByUserId(userId: string): Promise<AccountReadModel[]> {
    const cacheKey = `user_accounts:${userId}`;

    // 1. Check L1 Cache
    const l1Cached = this.l1Cache.get<AccountReadModel[]>(cacheKey);
    if (l1Cached) {
      this.logger.debug(`[CACHE HIT] L1 for user accounts: ${cacheKey}`);
      return l1Cached;
    }

    // 2. Check L2 Cache
    const l2Cached = await this.l2Cache.get<AccountReadModel[]>(cacheKey);
    if (l2Cached) {
      this.logger.debug(`[CACHE HIT] L2 for user accounts: ${cacheKey}`);
      this.l1Cache.set(cacheKey, l2Cached);
      return l2Cached;
    }

    // 3. Cache Miss: Fetch from the database
    this.logger.debug(`[CACHE MISS] L1/L2 for user accounts: ${cacheKey}. Fetching from DB.`);
    const accounts = await this.readModelRepository.findBy({ userId });

    if (accounts && accounts.length > 0) {
      // 4. Populate caches
      const l2CacheTtlMs = 600 * 1000; // 10 minutes for a list
      await this.l2Cache.set(cacheKey, accounts, l2CacheTtlMs);
      this.l1Cache.set(cacheKey, accounts);
      this.logger.debug(`[CACHE SET] L1/L2 populated for user accounts: ${cacheKey}`);
    }

    return accounts;
  }
}
