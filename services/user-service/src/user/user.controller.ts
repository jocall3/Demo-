import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { CreateUserEvent } from './events/create-user.event';

/**
 * @class UserController
 * @description This controller serves as the asynchronous entry point for the User service.
 * It subscribes to topics on the message bus (Kafka) and handles incoming events
 * by delegating tasks to the UserService. It does not expose any synchronous HTTP endpoints.
 * This aligns with the event-driven, choreography-based communication pattern of the architecture.
 */
@Controller()
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * @method handleUserCreated
   * @description Subscribes to the 'auth.user.created' Kafka topic.
   * This event is expected to be emitted by an authentication service when a new user signs up.
   * This handler is responsible for creating a corresponding user profile within the
   * user-service's bounded context and database.
   *
   * @param {CreateUserEvent} data - The payload of the event, containing user details.
   * @param {KafkaContext} context - The context of the Kafka message for manual offset commit.
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
      // Delegate the actual creation logic to the user service.
      const newUser = await this.userService.createUser(data);
      this.logger.log(
        `Successfully created user profile with ID: ${newUser.id} for authId: ${data.authId}`,
      );

      // Manually commit the offset to ensure the message is not re-processed.
      const partition = context.getPartition();
      const topic = context.getTopic();
      await context.getConsumer().commitOffsets([{ topic, partition, offset: String(Number(offset) + 1) }]);

    } catch (error) {
      this.logger.error(
        `Failed to process 'auth.user.created' event for authId: ${data.authId}`,
        error.stack,
      );
      // In a production system, an error here would trigger an alert or a dead-letter queue mechanism.
      // For this example, we log the error and let the offset commit fail, which would cause a retry.
    }
  }

  // Future event handlers can be added here. For example:
  // @EventPattern('plaid.item.created')
  // handlePlaidItemLinked(@Payload() data: PlaidItemCreatedEvent) {
  //   this.logger.log(`User ${data.userId} has linked a new Plaid item.`);
  //   this.userService.updateUserPlaidStatus(data.userId, true);
  // }
}
