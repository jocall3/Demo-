/**
 * @file services/user-service/src/infrastructure/controllers/user.controller.ts
 * @description Inbound adapter for the user-service, handling asynchronous events from the message bus.
 * @adherencefor Hexagonal Architecture: This controller is an "inbound adapter" that translates external events into application use case calls.
 * @adherencefor CQRS/Event Sourcing: This controller consumes events from other domains to trigger commands, a key pattern in event-driven systems.
 * @adherencefor Centralized DML: The DTOs used here (e.g., CreateUserEventDto) would be generated from a central DML in a full implementation.
 * @author Elite AI Implementation Team
 */

import { Controller, Logger, ValidationPipe } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { UserService } from '../../application/services/user.service';

// =============================================================================
// Data Transfer Objects (DTOs) for Event Payloads
// =============================================================================

/**
 * @class CreateUserEventDto
 * @description Data Transfer Object for the `auth.user.created` event payload.
 * It's used with `class-validator` to validate incoming event data from the message bus,
 * ensuring data integrity before it's passed to the application's core logic.
 */
class CreateUserEventDto {
  /**
   * The unique identifier from the external authentication provider (e.g., Keycloak's 'sub' claim).
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  authId: string;

  /**
   * The user's email address. Must be a valid email format.
   * @type {string}
   */
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * The user's full name.
   * @type {string}
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * An optional URL for the user's profile picture.
   * @type {string | undefined}
   */
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

// =============================================================================
// CONTROLLER (INBOUND ADAPTER)
// =============================================================================

/**
 * @class UserController
 * @description This controller is an **inbound adapter** in a Hexagonal Architecture.
 * Its sole responsibility is to handle incoming requests from an external source—in this case,
 * asynchronous events from a Kafka message bus—and translate them into calls on the application's
 * core logic (the application service).
 *
 * It subscribes to topics like 'auth.user.created', consumes the event payload, and
 * delegates the processing to the `UserService`, which represents the application's
 * primary "input port". This keeps the core logic clean and independent of the
 * delivery mechanism (Kafka).
 */
@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  /**
   * @constructor
   * @param {UserService} userService The application service that contains core business logic.
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Handles the `auth.user.created` event, which is typically published by an
   * external authentication service (e.g., Keycloak via a bridge) when a new user registers.
   * This method consumes the event and orchestrates the creation of a corresponding user profile
   * within this service's domain. It also handles manual offset committing for reliable message processing.
   *
   * @param {CreateUserEventDto} data The event payload, containing essential user details
   * like `authId` (the ID from the authentication provider), `email`, and `name`.
   * @param {KafkaContext} context The Kafka message context, providing access to message metadata
   * for operations like manual offset commits.
   * @returns {Promise<void>} A promise that resolves when the user profile has been successfully created
   * and the message offset has been committed.
   */
  @EventPattern('auth.user.created')
  async handleUserCreated(
    @Payload(new ValidationPipe()) data: CreateUserEventDto,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const { offset } = context.getMessage();
    const topic = context.getTopic();
    const partition = context.getPartition();

    const logContext = { topic, partition, offset: String(offset), authId: data.authId };

    this.logger.log(
      logContext,
      `Received '${topic}' event.`,
    );

    try {
      // Delegate the domain-specific logic of creating the user to the application service.
      const newUser = await this.userService.createUser(data);
      this.logger.log(
        { ...logContext, userId: newUser.id },
        `Successfully processed 'user.created' event and created user profile.`,
      );

      // Manually commit the offset to ensure that this specific message is marked as processed.
      // This is crucial for at-least-once delivery semantics and preventing reprocessing in case of failure.
      await context.getConsumer().commitOffsets([{ topic, partition, offset: String(Number(offset) + 1) }]);
      this.logger.debug(logContext, `Committed Kafka offset ${Number(offset) + 1}.`);

    } catch (error) {
      this.logger.error(
        {
          ...logContext,
          err: { message: error.message, stack: error.stack },
        },
        `Failed to process 'auth.user.created' event. The message will be redelivered by Kafka upon consumer restart or after a timeout.`,
      );
      // In a robust production system, failures here would trigger an alert.
      // Not committing the offset ensures Kafka will re-deliver the message, providing a retry mechanism.
      // For persistent errors, a Dead-Letter Queue (DLQ) strategy would be necessary to prevent infinite retries.
    }
  }
}
