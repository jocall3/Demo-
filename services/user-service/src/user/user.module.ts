import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain Layer
import { User } from './domain/user.entity';

// Application Layer
import { UserService } from './application/user.service';

// Infrastructure Layer (Adapters)
import { UserResolver } from './infrastructure/graphql/user.resolver';
import { UserController } from './infrastructure/messaging/user.controller';
import { TypeOrmUserRepositoryAdapter } from './infrastructure/adapters/typeorm-user.repository';
import { KafkaEventPublisherAdapter } from './infrastructure/adapters/kafka-event.publisher';

/**
 * @module UserModule
 * @description Encapsulates all logic for the User bounded context, strictly adhering to Hexagonal Architecture.
 * This module is responsible for wiring together the domain, application, and infrastructure layers.
 * It provides concrete adapter implementations which are then injected into the application service.
 */
@Module({
  imports: [
    // Makes the TypeORM repository for the `User` entity available for injection.
    // This is required by the `TypeOrmUserRepositoryAdapter`.
    TypeOrmModule.forFeature([User]),
  ],
  // Registers controllers that handle inbound requests/events from external systems.
  // In this case, `UserController` handles asynchronous events from the Kafka message bus.
  controllers: [UserController],
  // Defines the services and adapters that are part of this module.
  // NestJS will manage their lifecycle and dependency injection.
  providers: [
    // Inbound Adapter for the GraphQL API.
    UserResolver,

    // The core Application Service which orchestrates business logic.
    UserService,

    // Outbound Adapters for infrastructure concerns.
    // These concrete classes are provided so they can be injected as dependencies
    // into the UserService, following the dependency injection pattern used across the services.
    TypeOrmUserRepositoryAdapter,
    KafkaEventPublisherAdapter,
  ],
  // Exports the `UserService` to make it available to other modules if needed, for instance,
  // in end-to-end tests or if another local module needed to call it directly.
  exports: [UserService],
})
export class UserModule {}
