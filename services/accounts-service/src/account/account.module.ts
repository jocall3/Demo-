import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@nestjs/microservices';

// Presentation Layer
import { AccountResolver } from './account.resolver';

// Application Layer - Command Side
import { AccountCommandService } from './commands/account-command.service';
import { AccountController } from './account.controller';

// Domain & Infrastructure Layer - Event Sourcing (Write Model)
import { AccountEventRepository } from './eventsourcing/account-event.repository';
// Note: AccountAggregate is a pure domain model, not a NestJS provider.

// Application Layer - Query Side
import { AccountQueryService } from './queries/account-query.service';

// Infrastructure Layer - Read Model (Projections)
import { AccountProjection } from './read-model/account.projection'; // TypeORM Entity for the read model
import { AccountProjectionService } from './read-model/account-projection.service'; // Event handler to update the read model

// Import constants for Kafka client from shared EventBusModule
import { EVENT_BUS_CLIENT } from '../event-bus/event-bus.module';

/**
 * @module AccountModule
 * @description Encapsulates all logic for the Account bounded context, adhering strictly to
 * CQRS and Event Sourcing principles. This module orchestrates the flow from commands
 * to event storage, and from events to read model projections.
 *
 * It is responsible for:
 * - Exposing GraphQL queries and mutations (`AccountResolver`).
 * - Handling inbound asynchronous events (`AccountController`).
 * - Processing commands and interacting with the Event Store (`AccountCommandService`, `AccountEventRepository`).
 * - Managing and providing access to the read model (projections) (`AccountQueryService`).
 * - Maintaining the read model by reacting to domain events (`AccountProjectionService`).
 */
@Module({
  imports: [
    ConfigModule, // Provides access to environment variables for configuration.
    
    // Configure TypeORM specifically for the read model (projections).
    // The write model (AccountAggregates) is managed by the Event Store.
    TypeOrmModule.forFeature([AccountProjection]),
    
    // Import the Kafka client configured in EventBusModule. This enables
    // AccountEventRepository to publish events and AccountProjectionService
    // to subscribe to them.
    ClientsModule.forFeature([{ name: EVENT_BUS_CLIENT }]),
  ],
  providers: [
    // Presentation layer: GraphQL API entry point
    AccountResolver,
    
    // Application layer: Command handling and event listening
    AccountCommandService,
    AccountController,
    
    // Domain/Infrastructure layer: Event Sourcing components
    AccountEventRepository,
    
    // Application layer: Query handling
    AccountQueryService,
    
    // Infrastructure layer: Read model projection handling
    AccountProjectionService,
  ],
  exports: [
    // Export core services that might be used by the root AppModule or other modules.
    AccountCommandService,
    AccountQueryService,
    AccountProjectionService,
  ],
})
export class AccountModule {}