import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { join } from 'path';

import { OnboardingModule } from './onboarding/onboarding.module';
import { OpaAuthzModule } from './authz/opa-authz.module';
import configuration from './config/configuration';
import { SupergraphModule } from './supergraph/supergraph.module';

/**
 * @module AppModule
 * @description The root module for the Onboarding Experience API.
 *
 * ARCHITECTURAL OVERVIEW:
 * This Experience API is a new microservice tier that sits between client applications and the federated Supergraph.
 * Its purpose is to orchestrate and aggregate data from the supergraph, shaping payloads specifically for the
 * user onboarding journey.
 *
 * This module configures the foundational aspects of the service:
 * - **Configuration**: Uses `@nestjs/config` for environment-variable-based configuration.
 * - **GraphQL Server**: Exposes a dedicated GraphQL API for the onboarding frontend, using a non-federated Apollo Server.
 * - **Supergraph Client**: Imports a dedicated `SupergraphModule` that configures an Apollo Client to query the main federated gateway.
 * - **Multi-Tier Caching**: Implements the L1/L2 caching strategy using `@nestjs/cache-manager`, with an in-memory L1 cache and a distributed Redis L2 cache.
 * - **Authorization**: Integrates the `OpaAuthzModule` for externalized authorization decisions via Open Policy Agent (OPA).
 * - **Feature Logic**: Imports the core `OnboardingModule` which contains the business logic for this experience.
 */
@Module({
  imports: [
    // --- Core Infrastructure ---
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),

    // --- Caching (L1/L2 Strategy) ---
    // Implements the multi-tier caching directive.
    // L1 cache is the default in-memory store provided by cache-manager.
    // L2 cache is a distributed Redis store. The CachingRepository will handle the tiers.
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // @ts-ignore - cache-manager-redis-store types might not align perfectly with @nestjs/cache-manager
        store: await redisStore({
          url: configService.get<string>('redis.url'),
          ttl: configService.get<number>('redis.ttlSeconds'),
        }),
      }),
      inject: [ConfigService],
    }),

    // --- GraphQL Server for Onboarding Frontend ---
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req }) => ({ req }),
    }),

    // --- Communication with Downstream Services ---
    HttpModule, // For general HTTP requests, e.g., to OPA sidecar
    SupergraphModule, // Dedicated module for an injectable Apollo Client to query the supergraph

    // --- Security ---
    OpaAuthzModule, // Module for OPA integration and authorization

    // --- Feature Modules ---
    OnboardingModule,
  ],
})
export class AppModule {}
