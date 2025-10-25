/**
 * @file packages/caching-repository/src/index.ts
 * @description Implements a generic, multi-tiered caching repository as per architectural directive.
 *
 * @architectural_directive Implement a Multi-Tier (L1/L2) Caching Strategy with a Proactive Cache Warming Service
 * This file provides a generic `CachingRepository` class that abstracts away a two-tiered
 * caching strategy (L1 in-memory, L2 distributed) from the core business logic. It implements
 * read-through and write-through patterns to ensure data consistency between the caches and the
 * primary data store.
 *
 * This repository is designed to be a wrapper around a primary repository adapter (e.g., a TypeORM repository),
 * transparently adding caching capabilities without requiring changes to the application services that use it.
 */

/**
 * @interface ICache
 * @description A generic interface for a cache store. Both L1 (in-memory) and L2 (distributed)
 * cache clients should implement this contract, allowing them to be used interchangeably.
 * @template T The type of the value being stored in the cache.
 */
export interface ICache<T = any> {
  /**
   * Retrieves a value from the cache by its key.
   * @param {string} key The unique key for the cached item.
   * @returns {Promise<T | null>} A promise that resolves to the cached value, or null if not found.
   */
  get(key: string): Promise<T | null>;

  /**
   * Stores a value in the cache.
   * @param {string} key The unique key for the item.
   * @param {T} value The value to store.
   * @param {number} [ttl_ms] Optional Time-To-Live for the item in milliseconds.
   * @returns {Promise<void>}
   */
  set(key: string, value: T, ttl_ms?: number): Promise<void>;

  /**
   * Deletes a value from the cache by its key.
   * @param {string} key The unique key of the item to delete.
   * @returns {Promise<void>}
   */
  del(key: string): Promise<void>;
}

/**
 * @interface IPrimaryRepository
 * @description A generic interface representing the contract for a primary data store repository.
 * The `CachingRepository` wraps an implementation of this interface.
 * @template T The type of the entity being managed, which must have an `id` property.
 */
export interface IPrimaryRepository<T extends { id: string }> {
  /**
   * Finds an entity by its unique identifier from the primary data store (e.g., database).
   * @param {string} id The unique identifier of the entity.
   * @returns {Promise<T | null>} A promise that resolves to the entity, or null if not found.
   */
  findById(id: string): Promise<T | null>;

  /**
   * Saves (creates or updates) an entity in the primary data store.
   * @param {T | Partial<T>} entity The entity to save.
   * @returns {Promise<T>} A promise that resolves to the saved entity, potentially with updated fields (e.g., auto-generated IDs, timestamps).
   */
  save(entity: T | Partial<T>): Promise<T>;

  /**
   * Deletes an entity from the primary data store by its unique identifier.
   * @param {string} id The unique identifier of the entity to delete.
   * @returns {Promise<void>}
   */
  delete(id: string): Promise<void>;
}

/**
 * @interface CachingRepositoryOptions
 * @description Configuration options for the CachingRepository.
 */
export interface CachingRepositoryOptions {
  /**
   * Time-To-Live for the L1 (in-memory) cache in milliseconds.
   * This should be a short duration for ultra-hot data.
   * @type {number}
   */
  l1_ttl_ms: number;

  /**
   * Time-To-Live for the L2 (distributed) cache in milliseconds.
   * This can be a longer duration for warm data.
   * @type {number}
   */
  l2_ttl_ms: number;

  /**
   * A prefix for all cache keys related to this repository instance (e.g., 'user', 'account').
   * This prevents key collisions between different entity types.
   * @type {string}
   */
  keyPrefix: string;
}

/**
 * @class CachingRepository
 * @description A generic repository that implements a multi-tiered (L1/L2) caching strategy
 * with read-through and write-through patterns. It acts as a decorator for a primary repository.
 * @template T The type of the entity being managed. The entity must have a string `id` property.
 */
export class CachingRepository<T extends { id: string }> implements IPrimaryRepository<T> {
  /**
   * @constructor
   * @param {IPrimaryRepository<T>} primaryRepository The repository that interacts directly with the database.
   * @param {ICache<T>} l1Cache The fast, short-lived in-memory cache instance (L1).
   * @param {ICache<T>} l2Cache The shared, longer-lived distributed cache instance (L2, e.g., Redis).
   * @param {CachingRepositoryOptions} options Configuration for TTLs and key prefixing.
   */
  constructor(
    private readonly primaryRepository: IPrimaryRepository<T>,
    private readonly l1Cache: ICache<T>,
    private readonly l2Cache: ICache<T>,
    private readonly options: CachingRepositoryOptions,
  ) {}

  /**
   * Generates a unique cache key for an entity ID.
   * @private
   * @param {string} id The entity's unique identifier.
   * @returns {string} The fully-qualified cache key.
   */
  private getKey(id: string): string {
    return `${this.options.keyPrefix}:${id}`;
  }

  /**
   * Finds an entity by its ID using a multi-tiered read-through caching strategy.
   * 1. Checks L1 cache.
   * 2. If miss, checks L2 cache.
   * 3. If miss, fetches from the primary repository (database).
   * 4. Populates caches on a miss.
   * @param {string} id The unique identifier of the entity.
   * @returns {Promise<T | null>} The entity, or null if not found.
   */
  async findById(id: string): Promise<T | null> {
    const key = this.getKey(id);

    // 1. Check L1 Cache (In-Memory)
    const l1Item = await this.l1Cache.get(key);
    if (l1Item) {
      return l1Item;
    }

    // 2. Check L2 Cache (Distributed)
    const l2Item = await this.l2Cache.get(key);
    if (l2Item) {
      // Populate L1 on L2 hit for subsequent fast access
      await this.l1Cache.set(key, l2Item, this.options.l1_ttl_ms);
      return l2Item;
    }

    // 3. Cache Miss: Fetch from Primary Repository
    const freshItem = await this.primaryRepository.findById(id);

    if (freshItem) {
      // Populate both caches with the fresh item
      // The `await` calls can be run in parallel for a minor performance gain.
      await Promise.all([
        this.l2Cache.set(key, freshItem, this.options.l2_ttl_ms),
        this.l1Cache.set(key, freshItem, this.options.l1_ttl_ms),
      ]);
    }

    // Note: Negative caching (caching `null` results) could be added here
    // to prevent repeated database lookups for non-existent IDs.

    return freshItem;
  }

  /**
   * Saves an entity using a write-through caching strategy.
   * 1. Persists the entity to the primary repository.
   * 2. Updates both L1 and L2 caches with the newly saved entity data.
   * @param {T | Partial<T>} entity The entity to save.
   * @returns {Promise<T>} The saved entity as returned by the primary repository.
   */
  async save(entity: T | Partial<T>): Promise<T> {
    // 1. Save to primary repository first to ensure data integrity and get the final state.
    const savedEntity = await this.primaryRepository.save(entity);
    const key = this.getKey(savedEntity.id);

    // 2. Write the result through to both caches.
    await Promise.all([
      this.l2Cache.set(key, savedEntity, this.options.l2_ttl_ms),
      this.l1Cache.set(key, savedEntity, this.options.l1_ttl_ms),
    ]);

    return savedEntity;
  }

  /**
   * Deletes an entity and invalidates it from all cache tiers.
   * This is a write-invalidate pattern.
   * 1. Deletes the entity from the primary repository.
   * 2. Deletes the entity from both L1 and L2 caches.
   * @param {string} id The unique identifier of the entity to delete.
   * @returns {Promise<void>}
   */
  async delete(id: string): Promise<void> {
    // 1. Delete from primary repository first.
    await this.primaryRepository.delete(id);
    const key = this.getKey(id);

    // 2. Invalidate (delete) from both caches.
    await Promise.all([this.l2Cache.del(key), this.l1Cache.del(key)]);
  }
}
