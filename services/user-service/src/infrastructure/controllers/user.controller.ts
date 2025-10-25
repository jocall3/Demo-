import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
// Adjusted import path for Hexagonal Architecture
import { UserService } from '../../application/services/user.service';
// DTOs/Events are now part of the application layer's input port definitions
import { CreateUserEvent } from '../../application/dtos/create-user.event';

/**
 * @class UserController
 * @description In a Hexagonal Architecture, this controller is an **inbound adapter**.
 * Its sole responsibility is to handle incoming requests from an external source—in this case,
 * asynchronous events from a Kafka message bus—and translate them into calls on the application's
 * core logic (the application service).
 *
 * It subscribes to topics like 'auth.user.created', consumes the event payload, and
 * delegates the processing to the `UserService`, which represents the application's
 * primary "input port". This keeps the core logic clean and independent of the
 * delivery mechanism (Kafka).
 * @implements {JSDoc/TSDoc directive for every exported class}
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
   * @param {CreateUserEvent} data The event payload, containing essential user details
   * like `authId` (the ID from the authentication provider), `email`, and `name`.
   * @param {KafkaContext} context The Kafka message context, providing access to message metadata
   * for operations like manual offset commits.
   * @returns {Promise<void>} A promise that resolves when the user profile has been successfully created
   * and the message offset has been committed.
   */
  @EventPattern('auth.user.created')
  async handleUserCreated(
    @Payload() data: CreateUserEvent,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const { offset } = context.getMessage();
    const topic = context.getTopic();
    const partition = context.getPartition();

    this.logger.log(
      `Received '${topic}' event for authId: ${data.authId} at offset ${offset} on partition ${partition}`,
    );

    try {
      // Delegate the domain-specific logic of creating the user to the application service.
      const newUser = await this.userService.createUser(data);
      this.logger.log(
        `Successfully processed 'user.created' event. New user ID: ${newUser.id} for authId: ${data.authId}`,
      );

      // Manually commit the offset to ensure that this specific message is marked as processed.
      // This is crucial for at-least-once delivery semantics and preventing reprocessing in case of failure.
      await context.getConsumer().commitOffsets([{ topic, partition, offset: String(Number(offset) + 1) }]);
      this.logger.log(`Committed offset ${offset} for topic ${topic} on partition ${partition}.`);

    } catch (error) {
      this.logger.error(
        `Failed to process 'auth.user.created' event for authId: ${data.authId}. Error: ${error.message}`,
        error.stack,
      );
      // In a robust production system, failures here would trigger:
      // 1. Alerting mechanisms (e.g., PagerDuty).
      // 2. Potentially moving the message to a Dead-Letter Queue (DLQ) for manual inspection/reprocessing.
      // Not committing the offset will cause Kafka to re-deliver the message to a consumer in the group,
      // which acts as a built-in retry mechanism for transient errors.
    }
  }

  // Other event handlers would be added here as the system grows. For example:
  //
  // @EventPattern('profile.details.updated')
  // async handleProfileDetailsUpdated(@Payload() data: UpdateProfileEvent) {
  //   this.logger.log(`Received 'profile.details.updated' for user ${data.userId}`);
  //   // ... delegate to userService.updateProfile ...
  // }
}
