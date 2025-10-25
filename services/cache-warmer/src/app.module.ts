import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { redisStore } from 'cache-manager-redis-store';

import { WarmingModule } from './warming/warming.module';

/**
 * The root module for the Cache Warmer Service.
 *
 * ARCHITECTURAL OVERVIEW:
 * This service is a dedicated component of the multi-tiered caching strategy. Its sole responsibility
 * is to proactively populate the L2 distributed cache (Redis) with complex, aggregated query
 * results before they are ever requested by an application.
 *
 * It operates by:
 * 1.  Subscribing to domain event streams from Kafka (e.g., `transaction.created`, `account.updated`).
 * 2.  On receiving an event, triggering a "warming" process for related data aggregates.
 * 3.  Fetching necessary data from various read-model projections (e.g., from accounts-projection-service).
 * 4.  Computing the aggregated result that would typically be expensive to generate on-the-fly.
 * 5.  Storing this computed result in the L2 Redis cache with an appropriate TTL.
 *
 * This module sets up the foundational infrastructure for the service:
 * - `ConfigModule`: For loading environment variables (Kafka brokers, Redis URL, etc.).
 * - `CacheModule`: To connect to the L2 Redis cache where results will be stored.
 * - `HttpModule`: To enable communication with other microservices' read-model APIs.
 * - `WarmingModule`: The feature module containing the Kafka consumers and business logic.
 */
@Module({
  imports: [
    // --- Core Infrastructure Modules ---

    // Global configuration module to load environment variables from a .env file.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // Distributed L2 Cache (Redis) configuration.
    // This is where the warmed cache entries will be stored.
    CacheModule.registerAsync({
      isGlobal: true, // Make the cache manager available globally.
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          url: configService.getOrThrow<string>('REDIS_URL'),
          // Default TTL for keys in milliseconds
          ttl: configService.get<number>('CACHE_DEFAULT_TTL_SECONDS', 300) * 1000,
        });
        return {
          store: () => store,
        };
      },
      inject: [ConfigService],
    }),

    // HTTP module for making outbound requests to other microservices (read models).
    HttpModule,

    // --- Feature Module ---

    // The core module containing the cache warming logic and Kafka consumers.
    WarmingModule,
  ],
})
export class AppModule {}
