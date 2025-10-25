import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AgentService } from './agent.service';
import { AgentResolver } from './agent.resolver';
import { AgentController } from './agent.controller';
import { EventBusModule } from '../event-bus/event-bus.module';

/**
 * @module AgentModule
 * @description This module encapsulates the core logic for the AI Agent, including its GraphQL API,
 * event listeners, and business logic.
 *
 * ARCHITECTURAL REFACTOR:
 * This module has been updated to support the new event-driven and workflow-based architecture.
 * - It now includes the `AgentController`, which listens for Kafka events to trigger workflows.
 * - `AgentService` has been refactored to act as a facade for starting Temporal workflows and
 *   providing AI primitives as activities.
 * - It imports the `HttpModule` for the AgentService's needs and the `EventBusModule` for Kafka client injection,
 *   decoupling it from direct client configuration.
 * - The `TemporalModule` is consumed globally to provide the Temporal client for starting workflows.
 */
@Module({
  imports: [
    ConfigModule,
    HttpModule,
    // Provides the KAFKA_CLIENT for injection into services within this module.
    EventBusModule,
  ],
  controllers: [
    // Handles inbound events from the message bus (e.g., Kafka) to trigger workflows.
    AgentController,
  ],
  providers: [
    // Exposes the AI Agent's capabilities via the federated GraphQL schema.
    AgentResolver,
    // Contains core business logic, provides AI primitives, and acts as a facade to Temporal.
    AgentService,
  ],
  exports: [AgentService],
})
export class AgentModule {}
