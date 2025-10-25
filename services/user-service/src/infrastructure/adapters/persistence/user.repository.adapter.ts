/**
 * @file services/user-service/src/infrastructure/adapters/persistence/user.repository.adapter.ts
 * @description This file contains the persistence adapter for the User aggregate.
 *
 * @architectural-note This class is a concrete implementation of the `IUserRepository` port, acting
 * as a persistence adapter in a Hexagonal Architecture. It has been refactored to implement the
 * "Multi-Tier (L1/L2) Caching Strategy" directive.
 *
 * Caching Strategy:
 * - L1 Cache: A short-lived (10s TTL), in-memory cache within the service instance for ultra-low latency access.
 * - L2 Cache: A distributed cache (Redis, via NestJS CacheManager) for shared, longer-lived (5min TTL) caching.
 * - Pattern: Implements a read-through pattern for find operations and a write-invalidate pattern for save/delete operations.
 * - Consistency: Caches are invalidated upon any write to ensure data freshness, prioritizing consistency over cache hit ratio.
 * - Efficiency: For non-primary key lookups (email, authId), only the ID is cached to avoid data duplication.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { User } from '../../../domain/model/user';
import { IUserRepository } from '../../../application/ports/out/user.repository.port';

/**
 * @interface L1CacheEntry
 * @description Defines the structure for an entry in the L1 in-memory cache, including data and an expiry timestamp.
 * @template T The type of data being cached.
 */
interface L1CacheEntry<T> {
  data: T;
  expiry: number;
}

@Injectable()
export class UserRepositoryAdapter implements IUserRepository {
  private readonly logger = new Logger(UserRepositoryAdapter.name);

  // L1 In-Memory Cache with a simple TTL mechanism
  private readonly l1Cache = new Map<string, L1CacheEntry<User | string>>();
  private readonly L1_TTL_MS = 10 * 1000; // 10 seconds

  // L2 (Redis) Cache TTL
  private readonly L2_TTL_MS = 300 * 1000; // 5 minutes

  constructor(
    @InjectRepository(User)
    private readonly typeOrmRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly l2Cache: Cache,
  ) {}

  /**
   * Finds a user by their unique ID, implementing a read-through L1/L2 cache.
   * @param id The user's unique identifier.
   * @returns {Promise<User | null>} The found User entity or null.
   */
  async findById(id: string): Promise<User | null> {
    const key = this.generateCacheKey('id', id);

    // 1. Try L1 Cache
    const l1Hit = this.getFromL1Cache<User>(key);
    if (l1Hit) {
      this.logger.debug(`[CACHE L1 HIT] for user ID: ${id}`);
      return l1Hit;
    }

    // 2. Try L2 Cache
    const l2Hit = await this.getFromL2Cache<User>(key);
    if (l2Hit) {
      this.logger.debug(`[CACHE L2 HIT] for user ID: ${id}`);
      const user = Object.assign(new User(), l2Hit); // Re-instantiate class for methods
      this.setL1Cache(key, user); // Populate L1
      return user;
    }

    // 3. Cache Miss - Fetch from Database
    this.logger.debug(`[CACHE MISS] for user ID: ${id}. Fetching from DB.`);
    const user = await this.typeOrmRepository.findOneBy({ id });
    if (user) {
      // Populate caches on miss
      this.setL1Cache(key, user);
      await this.setL2Cache(key, user);
    }

    return user;
  }

  /**
   * Finds a user by their email. Caches the ID mapping to avoid data duplication.
   * @param email The user's email address.
   * @returns {Promise<User | null>} The found User entity or null.
   */
  async findByEmail(email: string): Promise<User | null> {
    const idMapKey = this.generateCacheKey('email', email);

    // 1. Check L1 for ID mapping
    let userId = this.getFromL1Cache<string>(idMapKey);
    if (userId) {
      this.logger.debug(`[CACHE L1 HIT] ID mapping for email: ${email}`);
      return this.findById(userId);
    }

    // 2. Check L2 for ID mapping
    userId = await this.getFromL2Cache<string>(idMapKey);
    if (userId) {
      this.logger.debug(`[CACHE L2 HIT] ID mapping for email: ${email}`);
      this.setL1Cache(idMapKey, userId);
      return this.findById(userId);
    }

    // 3. Cache Miss - Fetch from Database
    this.logger.debug(`[CACHE MISS] for email: ${email}. Fetching from DB.`);
    const user = await this.typeOrmRepository.findOneBy({ email });
    if (user) {
      // Populate caches with ID mapping
      this.setL1Cache(idMapKey, user.id);
      await this.setL2Cache(idMapKey, user.id);
      // Also cache the full user object by its primary key
      this.setL1Cache(this.generateCacheKey('id', user.id), user);
      await this.setL2Cache(this.generateCacheKey('id', user.id), user);
    }

    return user;
  }

  /**
   * Finds a user by their external authentication ID. Caches the ID mapping.
   * @param authId The user's external authentication ID.
   * @returns {Promise<User | null>} The found User entity or null.
   */
  async findByAuthId(authId: string): Promise<User | null> {
    const idMapKey = this.generateCacheKey('authId', authId);

    let userId = this.getFromL1Cache<string>(idMapKey);
    if (userId) {
      this.logger.debug(`[CACHE L1 HIT] ID mapping for authId: ${authId}`);
      return this.findById(userId);
    }

    userId = await this.getFromL2Cache<string>(idMapKey);
    if (userId) {
      this.logger.debug(`[CACHE L2 HIT] ID mapping for authId: ${authId}`);
      this.setL1Cache(idMapKey, userId);
      return this.findById(userId);
    }

    this.logger.debug(`[CACHE MISS] for authId: ${authId}. Fetching from DB.`);
    const user = await this.typeOrmRepository.findOneBy({ authId });
    if (user) {
      this.setL1Cache(idMapKey, user.id);
      await this.setL2Cache(idMapKey, user.id);
      this.setL1Cache(this.generateCacheKey('id', user.id), user);
      await this.setL2Cache(this.generateCacheKey('id', user.id), user);
    }

    return user;
  }

  /**
   * Retrieves all users. This query is not cached due to its broad nature.
   * @returns {Promise<User[]>} An array of all User entities.
   */
  async findAll(): Promise<User[]> {
    this.logger.debug('Finding all users from DB (uncached).');
    return this.typeOrmRepository.find();
  }

  /**
   * Persists a User entity and invalidates all relevant cache entries.
   * @param user The User entity to save.
   * @returns {Promise<User>} The saved User entity.
   */
  async save(user: User): Promise<User> {
    this.logger.debug(`Saving user with ID: ${user.id || 'new'}`);
    const savedUser = await this.typeOrmRepository.save(user);
    await this.invalidateCaches(savedUser);
    return savedUser;
  }

  /**
   * Deletes a user by ID and invalidates all relevant cache entries.
   * @param id The ID of the user to delete.
   * @returns {Promise<boolean>} True if deletion was successful.
   */
  async delete(id: string): Promise<boolean> {
    this.logger.debug(`Deleting user with ID: ${id}`);
    const userToDelete = await this.findById(id); // Fetch to get all details for cache invalidation
    if (!userToDelete) {
      return false;
    }

    const result = await this.typeOrmRepository.delete(id);
    if (result.affected > 0) {
      await this.invalidateCaches(userToDelete);
      return true;
    }
    return false;
  }

  // --- PRIVATE CACHING HELPERS ---

  private generateCacheKey(type: 'id' | 'email' | 'authId', value: string): string {
    return `user-service:user:${type}:${value}`;
  }

  private getFromL1Cache<T>(key: string): T | null {
    const entry = this.l1Cache.get(key) as L1CacheEntry<T> | undefined;
    if (entry && entry.expiry > Date.now()) {
      return entry.data;
    }
    if (entry) {
      this.l1Cache.delete(key); // Evict expired entry
    }
    return null;
  }

  private setL1Cache(key: string, data: any): void {
    this.l1Cache.set(key, { data, expiry: Date.now() + this.L1_TTL_MS });
  }

  private async getFromL2Cache<T>(key: string): Promise<T | null> {
    try {
      return await this.l2Cache.get<T>(key);
    } catch (error) {
      this.logger.error(`Failed to get from L2 cache for key ${key}`, error);
      return null;
    }
  }

  private async setL2Cache(key: string, data: any): Promise<void> {
    try {
      await this.l2Cache.set(key, data, this.L2_TTL_MS);
    } catch (error) {
      this.logger.error(`Failed to set to L2 cache for key ${key}`, error);
    }
  }

  /**
   * Invalidates all cache entries associated with a user in both L1 and L2 caches.
   * @param user The user object whose caches need to be invalidated.
   */
  private async invalidateCaches(user: User): Promise<void> {
    this.logger.debug(`[CACHE INVALIDATE] for user ID: ${user.id}`);
    const keys = [
      this.generateCacheKey('id', user.id),
      this.generateCacheKey('email', user.email),
      this.generateCacheKey('authId', user.authId),
    ];

    // Invalidate L1 Cache
    keys.forEach(key => this.l1Cache.delete(key));

    // Invalidate L2 Cache
    try {
      await Promise.all(keys.map(key => this.l2Cache.del(key)));
    } catch (error) {
      this.logger.error(`Failed to invalidate L2 cache for user ID ${user.id}`, error);
    }
  }
}
