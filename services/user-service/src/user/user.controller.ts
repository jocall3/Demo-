import { Controller, Logger, ValidationPipe } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { CreateUserEvent } from './events/create-user.event';

/**
 * @class UserController
 * @description This controller is an **Input Adapter** in a Hexagonal Architecture. It serves as the
 * entry point for asynchronous events related to user creation and updates. It subscribes
 * to specific topics on the message bus (Kafka) and delegates the business logic to the
 * application's core (the {@link UserService}). This keeps the controller thin and focused
 * on message consumption and translation.
 */
@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * @method handleUserCreated
   * @description Handles the `auth.user.created` domain event, which is typically published by an
   * external authentication service (e.g., Keycloak via an event bridge) when a new user
   * account is registered. This method consumes the event from Kafka and triggers the creation
   * of a corresponding user profile within this service's domain.
   *
   * It implements manual offset committing to ensure at-least-once delivery semantics. The offset
   * is only committed after the business logic (user creation) completes successfully.
   *
   * @param {CreateUserEvent} data - The validated payload of the event, containing essential user details
   * like `authId` (the ID from the authentication provider), `email`, and `name`.
   * @param {KafkaContext} context - The Kafka message context, providing access to message metadata
   * for operations like manual offset commits.
   * @returns {Promise<void>} A promise that resolves when the user profile has been successfully created
   * and the message offset has been committed.
   */
  @EventPattern('auth.user.created')
  async handleUserCreated(
    @Payload(new ValidationPipe()) data: CreateUserEvent,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const { offset } = context.getMessage();
    const topic = context.getTopic();
    const partition = context.getPartition();

    const logContext = { topic, partition, offset, authId: data.authId };

    this.logger.log(logContext, `Received '${topic}' event.`);

    try {
      // Delegate the domain-specific logic of creating the user to the application service.
      const newUser = await this.userService.createUser(data);
      this.logger.log(
        { ...logContext, userId: newUser.id },
        `Successfully created user profile.`,
      );

      // Manually commit the offset to ensure that this specific message is marked as processed.
      // This is crucial for at-least-once delivery semantics and preventing reprocessing on failure.
      await context.getConsumer().commitOffsets([{ topic, partition, offset: String(Number(offset) + 1) }]);
      this.logger.debug(logContext, `Committed offset ${Number(offset) + 1}.`);

    } catch (error) {
      this.logger.error(
        { ...logContext, err: { message: error.message, stack: error.stack } },
        `Failed to process '${topic}' event. The message will be redelivered by Kafka upon consumer restart.`,
      );
      // In a production system, failures here would trigger an alert.
      // Not committing the offset ensures Kafka will re-deliver the message, providing a retry mechanism.
      // If the error is persistent (e.g., malformed but passed validation), a Dead-Letter Queue (DLQ) strategy would be necessary.
    }
  }
}
