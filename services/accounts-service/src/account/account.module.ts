import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';

// Presentation Layer (Input Adapters)
import { AccountResolver } from './account.resolver';
import { AccountController } from './account.controller';

// Application Layer - Command Side
import { AccountCommandService } from './application/commands/account-command.service';

// Infrastructure Layer - Event Sourcing (Write Model Adapter)
import { AccountEventRepository } from './infrastructure/repositories/account-event.repository';

// Application Layer - Query Side
import { AccountQueryService } from './application/queries/account-query.service';

// Infrastructure Layer - Read Model (Projection & Projector Adapter)
import { AccountProjection } from './infrastructure/projections/account.projection'; // TypeORM Entity for the read model
import { AccountProjectionUpdater } from './infrastructure/projections/account-projection-updater.service'; // Event handler to update the read model

// Shared Infrastructure
import { EVENT_BUS_CLIENT } from '../event-bus/event-bus.module';

/**
 * @module AccountModule
 * @description Encapsulates all logic for the Account bounded context, adhering strictly to
 * CQRS, Event Sourcing, and Hexagonal Architecture principles. This module orchestrates the flow from
 * external inputs (GraphQL, Kafka events) to commands, then to event storage, and finally
 * from events to read model projections.
 *
 * It is responsible for:
 * - Exposing GraphQL queries and mutations (`AccountResolver`).
 * - Handling inbound asynchronous events from other domains (`AccountController`).
 * - Processing commands and interacting with the Event Store (`AccountCommandService`, `AccountEventRepository`).
 * - Managing and providing access to the read model (`AccountQueryService`).
 * - Maintaining the read model by reacting to this domain's own events (`AccountProjectionUpdater`).
 */
@Module({
  imports: [
    ConfigModule, // Provides access to environment variables for configuration.

    // Configure TypeOrm specifically for the read model (projections).
    // The write model (AccountAggregates) is managed by the Event Store and is not a TypeORM entity.
    TypeOrmModule.forFeature([AccountProjection]),

    // Import the Kafka client configured in the global EventBusModule. This enables
    // AccountEventRepository to publish events and AccountProjectionUpdater
    // to subscribe to them.
    ClientsModule.forFeature([{ name: EVENT_BUS_CLIENT }]),
  ],
  providers: [
    // --- Presentation Layer (Adapters) ---
    AccountResolver, // Handles GraphQL API requests.

    // --- Application Layer (Use Cases / Ports) ---
    AccountCommandService, // Orchestrates command execution for the write model.
    AccountQueryService,   // Provides methods to query the read model.

    // --- Infrastructure Layer (Adapters) ---
    AccountEventRepository,     // Adapter for persisting and retrieving events from the event store (Kafka).
    AccountProjectionUpdater, // Adapter that listens to domain events to update the read model.
  ],
  controllers: [
    // The controller now only handles inbound events from other services, acting as a command dispatcher.
    AccountController,
  ],
  exports: [
    // Export application services to be used by other parts of the service (e.g., for testing or cross-module logic).
    AccountCommandService,
    AccountQueryService,
  ],
})
export class AccountModule {}
