import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AccountService } from './account.service'; // This service will now act as a Command Handler Facade

/**
 * @description Defines the structure of the payload for a 'user.created' event.
 * This event is typically emitted by the UserService.
 */
interface UserCreatedEventPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * @description Defines the structure of the payload for a 'plaid.item.created' event.
 * This event is typically emitted by the PlaidIntegrationService after a successful item link.
 */
interface PlaidItemCreatedEventPayload {
  userId: string;
  itemId: string;
  // NOTE: The accessToken is sensitive and should ideally not be propagated via events.
  // In a robust CQRS/ES system, the Accounts service would typically request account
  // data from the PlaidIntegrationService directly (which securely holds the access token)
  // using userId and itemId, rather than being given the raw access token.
  // Keeping it here for consistency with existing service logic.
  accessToken: string;
  institutionName: string;
}

/**
 * @description Defines the structure of the payload for a 'transactions.synced' event.
 * This event is emitted by the PlaidIntegrationService when new transactions are available.
 */
interface TransactionsSyncedEventPayload {
  userId: string;
  itemId: string;
  transactions: any[]; // Assuming 'any' for raw Plaid transaction objects
  syncTimestamp: string;
}

/**
 * @description Defines the structure of the payload for a 'transaction.debited' or 'transaction.credited' event.
 * These events are emitted by the Transactions service for CQRS/Event Sourcing.
 */
interface TransactionBalanceUpdateEventPayload {
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  userId: string;
}

/**
 * The AccountController is an **Input Adapter** in the Hexagonal Architecture,
 * responsible for consuming asynchronous domain events from the central message bus (Kafka).
 * It acts as the "Command Dispatcher," translating incoming events into explicit commands
 * which are then processed by the core domain logic (represented by `AccountService` acting as a command handler facade).
 *
 * This controller adheres to the CQRS principle by only triggering state-changing operations
 * via commands, never exposing query endpoints.
 *
 * @class AccountController
 */
@Controller()
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    private readonly accountService: AccountService // Acts as a Command Handler Facade
  ) {}

  /**
   * Handles the 'user.created' event, triggered by the UserService.
   * This event prompts the creation of a default checking account for the new user.
   * Internally, this translates to dispatching a `CreateDefaultAccountCommand`.
   *
   * @param {UserCreatedEventPayload} event - The payload of the 'user.created' event.
   */
  @EventPattern('user.created')
  async handleUserCreated(@Payload() event: UserCreatedEventPayload): Promise<void> {
    this.logger.log(`Received 'user.created' event for userId: ${event.userId}`);
    try {
      // Dispatch a command to the AccountService to create the default account.
      // The AccountService is responsible for applying this command and emitting domain events.
      await this.accountService.createDefaultAccountForUser(event);
    } catch (error) {
      this.logger.error(`Failed to handle 'user.created' event for userId: ${event.userId}`, error.stack);
      // In a robust system, such failures would trigger alerts and potentially dead-letter queue processing.
    }
  }

  /**
   * Handles the 'plaid.item.created' event, triggered by the PlaidIntegrationService.
   * This event signifies that a user has successfully linked a new financial institution via Plaid.
   * It triggers a command to link the external institution's accounts to the user's profile
   * in this service, potentially creating new `Account` aggregates or updating existing ones.
   *
   * @param {PlaidItemCreatedEventPayload} event - The payload of the 'plaid.item.created' event.
   */
  @EventPattern('plaid.item.created')
  async handlePlaidItemCreated(@Payload() event: PlaidItemCreatedEventPayload): Promise<void> {
    this.logger.log(`Received 'plaid.item.created' event for userId: ${event.userId}, institution: ${event.institutionName}`);
    try {
      // Dispatch a command to link the external institution. The AccountService
      // will handle fetching accounts via the PlaidIntegrationService and persisting them.
      await this.accountService.linkExternalInstitution(event);
    } catch (error) {
      this.logger.error(`Failed to handle 'plaid.item.created' event for userId: ${event.userId}`, error.stack);
    }
  }

  /**
   * Handles the 'transactions.synced' event, emitted by the PlaidIntegrationService.
   * This event contains new and updated transaction data for a specific Plaid item.
   * For an Event Sourced 'Accounts' service, this event could potentially trigger
   * updates to account balances by projecting these transactions onto the account aggregates.
   *
   * @param {TransactionsSyncedEventPayload} event - The payload of the 'transactions.synced' event.
   */
  @EventPattern('transactions.synced')
  async handleTransactionsSynced(@Payload() event: TransactionsSyncedEventPayload): Promise<void> {
    this.logger.log(`Received 'transactions.synced' event for userId: ${event.userId}, item: ${event.itemId}.`);
    try {
      // In an Event Sourced system, this would trigger commands to update balances of affected accounts.
      // The AccountService would encapsulate this logic.
      await this.accountService.processSyncedTransactions(event);
    } catch (error) {
      this.logger.error(`Failed to handle 'transactions.synced' event for userId: ${event.userId}`, error.stack);
    }
  }

  /**
   * Handles the 'transaction.debited' event, emitted by the Transactions service
   * after a successful debit from a source account.
   * This event is a critical part of updating the aggregate state (account balance)
   * in an event-sourced `Accounts` service. It triggers a command to update the
   * balance of the affected account.
   *
   * @param {TransactionBalanceUpdateEventPayload} event - The payload of the 'transaction.debited' event.
   */
  @EventPattern('transaction.debited')
  async handleTransactionDebited(@Payload() event: TransactionBalanceUpdateEventPayload): Promise<void> {
    this.logger.log(`Received 'transaction.debited' event for accountId: ${event.accountId}, amount: ${event.amount}`);
    try {
      // This would trigger a command to the AccountService to update the balance of the specific account.
      await this.accountService.debitAccount(event.accountId, event.amount, event.transactionId);
    } catch (error) {
      this.logger.error(`Failed to handle 'transaction.debited' event for accountId: ${event.accountId}`, error.stack);
    }
  }

  /**
   * Handles the 'transaction.credited' event, emitted by the Transactions service
   * after a successful credit to a destination account.
   * Similar to `transaction.debited`, this event is crucial for updating the
   * aggregate state (account balance) in an event-sourced `Accounts` service.
   * It triggers a command to update the balance of the affected account.
   *
   * @param {TransactionBalanceUpdateEventPayload} event - The payload of the 'transaction.credited' event.
   */
  @EventPattern('transaction.credited')
  async handleTransactionCredited(@Payload() event: TransactionBalanceUpdateEventPayload): Promise<void> {
    this.logger.log(`Received 'transaction.credited' event for accountId: ${event.accountId}, amount: ${event.amount}`);
    try {
      // This would trigger a command to the AccountService to update the balance of the specific account.
      await this.accountService.creditAccount(event.accountId, event.amount, event.transactionId);
    } catch (error) {
      this.logger.error(`Failed to handle 'transaction.credited' event for accountId: ${event.accountId}`, error.stack);
    }
  }

  /**
   * Handles the 'transaction.refunded' event, emitted by the Transactions service
   * when a previously debited amount is refunded due to a transaction failure.
   * This triggers a command to reverse the debit on the source account.
   *
   * @param {TransactionBalanceUpdateEventPayload} event - The payload of the 'transaction.refunded' event.
   */
  @EventPattern('transaction.refunded')
  async handleTransactionRefunded(@Payload() event: TransactionBalanceUpdateEventPayload): Promise<void> {
    this.logger.log(`Received 'transaction.refunded' event for accountId: ${event.accountId}, amount: ${event.amount}`);
    try {
      // This would trigger a command to the AccountService to reverse the debit (i.e., credit back the amount).
      await this.accountService.refundAccount(event.accountId, event.amount, event.transactionId);
    } catch (error) {
      this.logger.error(`Failed to handle 'transaction.refunded' event for accountId: ${event.accountId}`, error.stack);
    }
  }

}
