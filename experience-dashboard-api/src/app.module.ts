import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { join } from 'path';
import { APP_GUARD } from '@nestjs/core';

import configuration from './config/configuration';
import { AuthzGuard } from './authz/authz.guard';
import { AuthzModule } from './authz/authz.module';
import { SupergraphModule } from './supergraph/supergraph.module';
import { DashboardModule } from './dashboard/dashboard.module';

/**
 * @module AppModule
 * @description The root module for the Dashboard Experience API.
 * This service acts as a dedicated Backend-for-Frontend (BFF) for the main dashboard experience.
 * It orchestrates data fetching from the federated supergraph, shapes payloads, and implements
 * caching and authorization logic specific to the dashboard's needs.
 *
 * ARCHITECTURAL DIRECTIVES IMPLEMENTED:
 * - **Multi-Tiered API Architecture:** This entire service is an implementation of the 'Experience Layer'.
 * - **Externalized Authorization (OPA):** The global `AuthzGuard` is registered here, which communicates
 *   with an OPA sidecar for every incoming request.
 * - **Multi-Tier Caching (L2):** The `CacheModule` is configured to use a distributed Redis store,
 *   acting as the L2 cache for this service. L1 in-memory caching is assumed to be handled
 *   within specific repository/adapter implementations.
 */
@Module({
  imports: [
    // --- Core Configuration ---
    // Loads environment variables and provides them via the ConfigService.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),

    // --- Caching Layer (L2 - Redis) ---
    // Configures a global Redis cache manager. This serves as the L2 cache for the
    // Multi-Tier Caching strategy, used for storing aggregated query results and other
    // frequently accessed data.
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const store = await redisStore({
          url: configService.getOrThrow<string>('redis.url'),
          ttl: configService.getOrThrow<number>('redis.ttlSeconds'),
        });
        return {
          store: () => store,
        };
      },
      inject: [ConfigService],
    }),

    // --- GraphQL Server ---
    // Configures this service to act as a GraphQL server, exposing the experience-specific schema.
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: {
          path: join(process.cwd(), 'src/schema.gql'),
          // Federation 2 is used to allow this service's types to be composed if needed,
          // though it primarily acts as a client to the main supergraph.
          federation: 2,
        },
        sortSchema: true,
        playground: configService.get<string>('NODE_ENV') !== 'production',
        // The context is built for each request. Here, we can attach request-scoped
        // information like headers, which are needed by the AuthzGuard and other services.
        context: ({ req }) => ({ req }),
      }),
      inject: [ConfigService],
    }),

    // --- Authorization Module (OPA Integration) ---
    // Imports the module responsible for providing the OPA authorization guard.
    AuthzModule,

    // --- Supergraph Client Module ---
    // Imports the module that provides a typed client for querying the federated supergraph.
    // This encapsulates the logic for communicating with the downstream API gateway.
    SupergraphModule,

    // --- Feature Modules ---
    // Imports the core business logic module for the dashboard experience.
    // This module contains the resolvers and services that orchestrate data fetching.
    DashboardModule,
  ],
  providers: [
    // --- Global Authorization Guard ---
    // Registers the AuthzGuard globally. Every incoming GraphQL request will be
    // intercepted by this guard, which queries the OPA sidecar for an 'allow' or 'deny' decision.
    // This completely decouples authorization logic from the business logic in resolvers.
    {
      provide: APP_GUARD,
      useClass: AuthzGuard,
    },
    Logger,
  ],
})
export class AppModule {}
