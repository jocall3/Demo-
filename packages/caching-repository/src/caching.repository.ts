/**
 * @file packages/caching-repository/src/caching.repository.ts
 * @description Implements a generic, multi-tiered caching repository.
 *
 * @architectural_directive Implement a Multi-Tier (L1/L2) Caching Strategy with a Proactive Cache Warming Service
 * This file provides the `CachingRepository`, a generic class that implements a multi-tier (L1/L2)
 * caching strategy. It follows the "read-through" and "write-invalidate" patterns to abstract
 * caching logic away from the core business services.
 *
 * - **L1 Cache**: A short-lived, in-memory LRU cache for ultra-low latency access to hot data within a service instance.
 * - **L2 Cache**: A distributed cache (e.g., Redis) for sharing cached data across service instances.
 *
 * Repository adapters throughout the microservices architecture will instantiate this class,
 * providing a "delegate" repository (for accessing the source of truth) and caching configuration.
 * This centralizes and standardizes caching logic, making it consistent and maintainable.
 */

import { Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { LRUCache } from 'lru-cache';

/**
 * @interface IDelegateRepository<T>
 * @description Defines the contract for the underlying repository that communicates
 * with the primary data source (e.g., a database or event store).
 * The `CachingRepository` will delegate calls to this repository on a cache miss.
 */
export interface IDelegateRepository<T> {
  /**
   * Finds an entity by its unique identifier from the source of truth.
   * @param {string} id - The unique ID of the entity.
   * @returns {Promise<T | null>} The entity if found, otherwise null.
   */
  findById(id: string): Promise<T | null>;

  /**
   * Persists an entity to the source of truth.
   * @param {T} entity - The entity to save.
   * @returns {Promise<T>} The saved entity, potentially with updated fields (e.g., version, timestamps).
   */
  save(entity: T): Promise<T>;

  /**
   * Deletes an entity by its unique identifier from the source of truth.
   * @param {string} id - The unique ID of the entity to delete.
   * @returns {Promise<void>}
   */
  deleteById(id: string): Promise<void>;
}

/**
 * @interface CachingRepositoryOptions
 * @description Configuration options for the CachingRepository.
 */
export interface CachingRepositoryOptions {
  /**
   * A unique name for the entity type being cached (e.g., 'account', 'user').
   * Used as a prefix for cache keys to prevent collisions.
   */
  entityName: string;
  /**
   * Time-to-live (TTL) for the L1 in-memory cache, in seconds.
   */
  l1TtlSeconds: number;
  /**
   * Time-to-live (TTL) for the L2 distributed cache, in seconds.
   */
  l2TtlSeconds: number;
  /**
   * The maximum number of items to store in the L1 in-memory LRU cache.
   * @default 500
   */
  l1MaxItems?: number;
}

/**
 * @class CachingRepository<T>
 * @description A generic repository that implements a multi-tier (L1/L2) caching strategy.
 * It wraps a delegate repository to provide read-through and write-invalidate caching.
 * @template T - The type of the entity being managed. Must have an `id: string` property.
 */
export class CachingRepository<T extends { id: string }> implements IDelegateRepository<T> {
  private readonly logger: Logger;
  private readonly l1Cache: LRUCache<string, T>;
  private readonly l1TtlMs: number;
  private readonly l2TtlMs: number;

  /**
   * @constructor
   * @param {IDelegateRepository<T>} delegate - The repository that communicates with the source of truth.
   * @param {Cache} l2Cache - The `cache-manager` instance for the L2 distributed cache.
   * @param {CachingRepositoryOptions} options - Configuration for caching behavior.
   */
  constructor(
    private readonly delegate: IDelegateRepository<T>,
    private readonly l2Cache: Cache,
    private readonly options: CachingRepositoryOptions,
  ) {
    this.logger = new Logger(`${CachingRepository.name}<${options.entityName}>`);
    this.l1TtlMs = options.l1TtlSeconds * 1000;
    this.l2TtlMs = options.l2TtlSeconds * 1000;

    this.l1Cache = new LRUCache<string, T>({
      max: options.l1MaxItems || 500,
      ttl: this.l1TtlMs,
    });

    this.logger.log(`Initialized with L1 TTL: ${options.l1TtlSeconds}s, L2 TTL: ${options.l2TtlSeconds}s`);
  }

  /**
   * Generates a unique cache key for a given entity ID.
   * @param {string} id - The entity's unique ID.
   * @returns {string} The cache key.
   */
  private getCacheKey(id: string): string {
    return `${this.options.entityName}:${id}`;
  }

  /**
   * Implements the read-through caching logic.
   * 1. Check L1 Cache (in-memory).
   * 2. Check L2 Cache (distributed).
   * 3. Fetch from the delegate repository (source of truth).
   * 4. Populate caches on the way back.
   * @param {string} id - The ID of the entity to find.
   * @returns {Promise<T | null>} The found entity or null.
   */
  async findById(id: string): Promise<T | null> {
    const key = this.getCacheKey(id);

    // 1. Check L1 Cache
    const l1Hit = this.l1Cache.get(key);
    if (l1Hit) {
      this.logger.debug(`[CACHE L1 HIT] for key: ${key}`);
      return l1Hit;
    }

    // 2. Check L2 Cache
    try {
      const l2Hit = await this.l2Cache.get<T>(key);
      if (l2Hit) {
        this.logger.debug(`[CACHE L2 HIT] for key: ${key}`);
        this.l1Cache.set(key, l2Hit); // Populate L1
        return l2Hit;
      }
    } catch (error) {
      this.logger.error(`[CACHE L2 ERROR] Failed to read from L2 cache for key ${key}.`, error);
    }

    // 3. Fetch from source
    this.logger.debug(`[CACHE MISS] for key: ${key}. Fetching from delegate.`);
    const sourceData = await this.delegate.findById(id);

    // 4. Populate caches
    if (sourceData) {
      try {
        await this.l2Cache.set(key, sourceData, this.l2TtlMs);
        this.l1Cache.set(key, sourceData);
        this.logger.debug(`[CACHE SET] Populated L1/L2 for key: ${key}`);
      } catch (error) {
        this.logger.error(`[CACHE L2 ERROR] Failed to write to L2 cache for key ${key}.`, error);
      }
    }

    return sourceData;
  }

  /**
   * Implements the write-invalidate caching logic.
   * 1. Write to the delegate repository (source of truth).
   * 2. Invalidate both L1 and L2 caches.
   * @param {T} entity - The entity to save.
   * @returns {Promise<T>} The saved entity.
   */
  async save(entity: T): Promise<T> {
    const savedEntity = await this.delegate.save(entity);
    const key = this.getCacheKey(savedEntity.id);

    this.logger.debug(`[CACHE INVALIDATE] for key: ${key} after save.`);
    this.l1Cache.delete(key);
    try {
      await this.l2Cache.del(key);
    } catch (error) {
      this.logger.error(`[CACHE L2 ERROR] Failed to invalidate L2 cache for key ${key}.`, error);
    }

    return savedEntity;
  }

  /**
   * Implements write-invalidate for deletion.
   * 1. Delete from the delegate repository.
   * 2. Invalidate both L1 and L2 caches.
   * @param {string} id - The ID of the entity to delete.
   * @returns {Promise<void>}
   */
  async deleteById(id: string): Promise<void> {
    await this.delegate.deleteById(id);
    const key = this.getCacheKey(id);

    this.logger.debug(`[CACHE INVALIDATE] for key: ${key} after delete.`);
    this.l1Cache.delete(key);
    try {
      await this.l2Cache.del(key);
    } catch (error) {
      this.logger.error(`[CACHE L2 ERROR] Failed to invalidate L2 cache for key ${key}.`, error);
    }
  }
}
