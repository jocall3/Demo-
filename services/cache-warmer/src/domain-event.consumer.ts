import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Inject, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Cache } from 'cache-manager';
import { DashboardQueryService } from '../queries/dashboard.query.service';

// --- DTOs for Kafka Event Payloads ---
// These interfaces define the contract for events this service consumes.
// They would typically come from a shared library generated from the DML.

interface TransactionEventPayload {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
}

interface AccountEventPayload {
  aggregateId: string; // accountId
  userId: string;
}

interface UserProfileEventPayload {
  userId: string;
}

/**
 * @class DomainEventConsumer
 * @description A NestJS controller that acts as the primary consumer of domain events for the Cache Warmer service.
 *
 * ARCHITECTURAL DIRECTIVE: Implement a Multi-Tier (L1/L2) Caching Strategy with a Proactive Cache Warming Service.
 *
 * This consumer is the core of the proactive cache warming strategy. It subscribes to various domain event
 * streams from Kafka. When an event signifies a change in a user's data (e.g., a new transaction,
 * an updated account balance), this consumer triggers a re-computation of complex, aggregated
 * query results (like a user's dashboard view) and proactively populates the L2 cache (Redis)
 * with the fresh data.
 *
 * This ensures that when a user-facing API (like an Experience API) requests this data,
 * it can be served directly from the cache, dramatically reducing latency and load on the
 * underlying data projection services.
 */
@Controller()
export class DomainEventConsumer {
  private readonly logger = new Logger(DomainEventConsumer.name);

  /**
   * @constructor
   * @param {DashboardQueryService} dashboardQueryService - A service responsible for computing the aggregated dashboard data.
   * @param {Cache} cache - The L2 cache manager, connected to Redis.
   */
  constructor(
    private readonly dashboardQueryService: DashboardQueryService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Handles events that signify a change in a user's transaction history.
   * This includes new transactions, updates to existing ones, or deletions.
   *
   * @param {TransactionEventPayload} payload - The payload of the transaction event.
   */
  @EventPattern(/transaction\.(created|updated|deleted)/) // Regex matches multiple transaction-related topics
  async handleTransactionChange(
    @Payload() payload: TransactionEventPayload,
  ): Promise<void> {
    const { userId } = payload;
    if (!userId) {
      this.logger.warn('Received transaction event without a userId. Cannot warm cache.', payload);
      return;
    }

    this.logger.log(`Transaction change detected for user ${userId}. Warming dashboard cache.`);
    await this.warmDashboardCache(userId);
  }

  /**
   * Handles events that signify a change in a user's account data, such as a balance update.
   *
   * @param {AccountEventPayload} payload - The payload of the account event.
   */
  @EventPattern(/account\.(created|balance\.updated|details\.updated)/)
  async handleAccountChange(
    @Payload() payload: AccountEventPayload,
  ): Promise<void> {
    const { userId } = payload;
    if (!userId) {
      this.logger.warn('Received account event without a userId. Cannot warm cache.', payload);
      return;
    }

    this.logger.log(`Account change detected for user ${userId}. Warming dashboard cache.`);
    await this.warmDashboardCache(userId);
  }

  /**
   * Handles events related to user profile changes, financial goals, or budgets,
   * as these can also affect the dashboard view.
   *
   * @param {UserProfileEventPayload} payload - The payload containing the userId.
   */
  @EventPattern(/(user\.profile\.updated|goal\..*|budget\..*)/)
  async handleUserRelatedChange(
    @Payload() payload: UserProfileEventPayload
  ): Promise<void> {
    const { userId } = payload;
    if (!userId) {
      this.logger.warn('Received user-related event without a userId. Cannot warm cache.', payload);
      return;
    }

    this.logger.log(`User-related data change detected for user ${userId}. Warming dashboard cache.`);
    await this.warmDashboardCache(userId);
  }

  /**
   * Core logic to warm the cache for a specific user's dashboard.
   * It invalidates the old cache entry, fetches the fresh aggregated data, and sets it in the cache.
   * This function is designed to be idempotent and resilient to errors.
   *
   * @param {string} userId - The ID of the user whose cache needs to be warmed.
   */
  private async warmDashboardCache(userId: string): Promise<void> {
    const cacheKey = this.dashboardQueryService.getDashboardCacheKey(userId);

    try {
      // Step 1: Invalidate the existing cache entry to ensure stale data is not served
      // while the new data is being computed.
      await this.cache.del(cacheKey);
      this.logger.debug(`Invalidated dashboard cache for user ${userId} with key: ${cacheKey}`);

      // Step 2: Compute the fresh, aggregated dashboard data. This service call is expected
      // to be a potentially expensive operation that queries multiple data sources.
      const freshDashboardData = await this.dashboardQueryService.getAggregatedDashboardData(userId);

      // Step 3: Populate the L2 cache with the new data and a defined TTL.
      // The TTL would be configured globally or based on the data's volatility.
      await this.cache.set(cacheKey, freshDashboardData);

      this.logger.log(`Successfully warmed dashboard cache for user ${userId}.`);
    } catch (error) {
      this.logger.error(
        `Failed to warm dashboard cache for user ${userId}. Key: ${cacheKey}`,
        error.stack,
      );
      // In a production system, failed warming attempts would be monitored and potentially
      // trigger alerts if the failure rate is high, as it indicates a problem in the
      // data aggregation logic or downstream services.
    }
  }
}
