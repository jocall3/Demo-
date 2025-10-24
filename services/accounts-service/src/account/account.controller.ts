import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AccountService } from './account.service';

/**
 * @description Defines the structure of the payload for a 'user.created' event.
 */
interface UserCreatedPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * @description Defines the structure of the payload for a 'plaid.item.created' event.
 */
interface PlaidItemCreatedPayload {
  userId: string;
  itemId: string;
  accessToken: string; // The service needs this to communicate with Plaid via the Plaid service
  institutionName: string;
}


/**
 * The AccountController is responsible for handling asynchronous events
 * related to the account domain. It follows an event-driven choreography pattern,
 * consuming events from the central message bus (e.g., Kafka) and delegating
 * business logic to the AccountService.
 *
 * This controller does not expose any synchronous HTTP endpoints as per the
 * microservice architectural guidelines. Its primary interface is the message bus.
 */
@Controller()
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(private readonly accountService: AccountService) {}

  /**
   * Handles the 'user.created' event, which is emitted by the UserService
   * whenever a new user signs up. This triggers the creation of a default
   * primary account for the new user.
   *
   * @param {UserCreatedPayload} data The payload of the event.
   */
  @EventPattern('user.created')
  async handleUserCreated(@Payload() data: UserCreatedPayload): Promise<void> {
    this.logger.log(`Received user.created event for userId: ${data.userId}`);
    try {
      await this.accountService.createDefaultAccountForUser(data);
    } catch (error) {
      this.logger.error(`Failed to handle user.created event for userId: ${data.userId}`, error.stack);
      // In a production system, this might push to a dead-letter queue.
    }
  }

  /**
   * Handles the 'plaid.item.created' event, which is emitted by the PlaidIntegrationService
   * when a user successfully links a new financial institution via Plaid Link.
   *
   * @param {PlaidItemCreatedPayload} data The payload of the event.
   */
  @EventPattern('plaid.item.created')
  async handlePlaidItemCreated(@Payload() data: PlaidItemCreatedPayload): Promise<void> {
    this.logger.log(`Received plaid.item.created event for userId: ${data.userId} and institution: ${data.institutionName}`);
    try {
      // The service will handle the logic of creating/updating linked account records.
      // The access token is sensitive and should be handled securely by the service layer,
      // likely by encrypting it before storing it in this service's database.
      await this.accountService.linkExternalInstitution(data);
    } catch (error) {
      this.logger.error(`Failed to handle plaid.item.created event for userId: ${data.userId}`, error.stack);
    }
  }
}
