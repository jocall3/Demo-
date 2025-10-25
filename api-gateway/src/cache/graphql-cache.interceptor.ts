/**
 * @file api-gateway/src/cache/graphql-cache.interceptor.ts
 * @description Implements a distributed caching layer for idempotent GraphQL queries at the API Gateway.
 *
 * @architectural_directive Implement a Multi-Layered Distributed Caching Strategy with Redis
 * This interceptor is a key part of the multi-layered caching strategy. It sits at the API Gateway
 * and intercepts all incoming GraphQL requests. For idempotent `query` operations, it implements a
 * cache-aside pattern using a distributed Redis cache.
 *
 * Core Logic:
 * 1.  Identifies if an incoming GraphQL request is a `query`.
 * 2.  Constructs a unique, user-specific cache key by hashing the query string and its variables, combined with the user's ID from the JWT.
 * 3.  Checks the Redis cache for a matching key.
 * 4.  On a **CACHE HIT**, it returns the cached response directly, preventing a costly round-trip to downstream microservices.
 * 5.  On a **CACHE MISS**, it allows the request to proceed to the Apollo Gateway. The successful response is then stored in Redis with a configured TTL before being returned to the client.
 *
 * This significantly reduces load on downstream services, improves response times for frequently requested data, and enhances system resilience.
 */

import {
  Injectable,
  ExecutionContext,
  CallHandler,
  NestInterceptor,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, of, from }
from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';

/**
 * @class GraphQLCacheInterceptor
 * @description A NestJS interceptor that provides caching for idempotent GraphQL queries.
 * It uses a distributed cache (configured via `CacheModule`) to store query results.
 */
@Injectable()
export class GraphQLCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GraphQLCacheInterceptor.name);
  private readonly ttl: number;

  /**
   * @constructor
   * @param {Cache} cacheManager - The injected cache manager instance, connected to Redis.
   * @param {ConfigService} configService - The service for accessing configuration variables.
   */
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {
    // Get the cache TTL from configuration, with a default of 60 seconds.
    this.ttl = this.configService.get<number>('cache.graphqlTtlSeconds', 60);
  }

  /**
   * @method intercept
   * @description The core method of the interceptor, implementing the cache-aside logic.
   * @param {ExecutionContext} context - The NestJS execution context for the incoming request.
   * @param {CallHandler} next - The next handler in the interceptor chain.
   * @returns {Observable<any>} An observable that resolves to either the cached data or the live response.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const gqlCtx = GqlExecutionContext.create(context);
    const info = gqlCtx.getInfo();
    const req = gqlCtx.getContext().req;

    const isQuery = info.operation.operation === 'query';
    // User ID is expected to be on the request object after passing through an authentication guard.
    const userId = req.user?.sub;

    // Skip caching for mutations, subscriptions, or unauthenticated requests.
    if (!isQuery || !userId) {
      return next.handle();
    }

    const cacheKey = this.createCacheKey(req.body, userId);

    // Return an observable that first attempts to fetch from the cache.
    return from(this.cacheManager.get(cacheKey)).pipe(
      switchMap((cachedResponse: any) => {
        if (cachedResponse) {
          this.logger.debug(`[CACHE HIT] for key: ${cacheKey}`);
          // If a cached response exists, return it immediately.
          return of(cachedResponse);
        }

        // If no cached response, proceed with the request.
        this.logger.debug(`[CACHE MISS] for key: ${cacheKey}`);
        return next.handle().pipe(
          tap((response) => {
            // When the response is received, store it in the cache with the configured TTL.
            // The TTL is converted to milliseconds for the cache-manager library.
            this.cacheManager.set(cacheKey, response, this.ttl * 1000);
            this.logger.debug(
              `[CACHE SET] for key: ${cacheKey} with TTL: ${this.ttl}s`,
            );
          }),
        );
      }),
    );
  }

  /**
   * @method createCacheKey
   * @description Creates a unique, deterministic cache key for a GraphQL request.
   * The key is a composite of the user's ID and a hash of the query and its variables.
   * This ensures that the cache is user-specific and query-specific.
   *
   * @param {object} body - The request body containing the GraphQL query and variables.
   * @param {string} userId - The unique identifier for the user.
   * @returns {string} The generated unique cache key.
   */
  private createCacheKey(
    body: { query: string; variables?: object },
    userId: string,
  ): string {
    const { query, variables } = body;
    const payload = JSON.stringify({ query, variables });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    return `graphql-cache:${userId}:${hash}`;
  }
}
