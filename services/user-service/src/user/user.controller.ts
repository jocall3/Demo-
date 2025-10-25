import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { CreateUserEvent } from './events/create-user.event';

/**
 * @class UserController
 * @description This controller acts as an application layer adapter, serving as the
 * entry point for asynchronous events related to user creation and updates.
 * It subscribes to specific topics on the message bus (Kafka), effectively acting
 * as an "into" the system via an "inbound port" in a Hexagonal Architecture context.
 * It delegates the actual business logic to the {@link UserService}, keeping itself thin.
 */
@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * @method handleUserCreated
   * @description Handles the `auth.user.created` event, which is published by an
   * external authentication service (e.g., Keycloak) when a new user account is registered.
   * This method consumes the event from the Kafka message bus and orchestrates the creation
   * of a corresponding user profile within this service's domain. It also handles manual
   * offset committing for reliable message processing.
   *
   * @param {CreateUserEvent} data - The payload of the event, containing essential user details
   * like `authId` (the ID from the authentication provider), `email`, and `name`.
   * @param {KafkaContext} context - The Kafka message context, providing access to message metadata
   * for operations like manual offset commits.
   * @returns {Promise<void>} A promise that resolves when the user profile has been successfully created
   * and the message offset has been committed, or rejects on failure.
   */
  @EventPattern('auth.user.created')
  async handleUserCreated(
    @Payload() data: CreateUserEvent,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const { offset } = context.getMessage();
    this.logger.log(
      `Received 'auth.user.created' event for email: ${data.email} at offset ${offset}`,
    );

    try {
      // Delegate the domain-specific logic of creating the user to the application service.
      const newUser = await this.userService.createUser(data);
      this.logger.log(
        `Successfully created user profile with ID: ${newUser.id} for authId: ${data.authId}`,
      );

      // Manually commit the offset to ensure that this specific message is marked as processed.
      // This is crucial for at-least-once delivery semantics and preventing reprocessing.
      const partition = context.getPartition();
      const topic = context.getTopic();
      await context.getConsumer().commitOffsets([{ topic, partition, offset: String(Number(offset) + 1) }]);

    } catch (error) {
      this.logger.error(
        `Failed to process 'auth.user.created' event for authId: ${data.authId}. Error: ${error.message}`,
        error.stack,
      );
      // In a robust production system, failures here would trigger: 
      // 1. Alerting mechanisms (e.g., PagerDuty).
      // 2. Potentially moving the message to a Dead-Letter Queue (DLQ) for manual inspection/reprocessing.
      // For this example, the offset commit failure will cause Kafka to re-deliver the message, triggering a retry.
    }
  }

  // Future event handlers can be added here to respond to other domain events.
  // For example:
  // @EventPattern('user.account.linked')
  // async handleAccountLinked(@Payload() data: UserAccountLinkedEvent) {
  //   this.logger.log(`User ${data.userId} has linked a new financial account.`);
  //   await this.userService.updateUserFinancialStatus(data.userId, true);
  // }
}