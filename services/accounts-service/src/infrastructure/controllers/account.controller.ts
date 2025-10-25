/**
 * @file services/accounts-service/src/infrastructure/controllers/account.controller.ts
 * @description This controller is an inbound adapter in a Hexagonal Architecture. It subscribes
 * to domain events from a message bus (Kafka) and translates them into commands for the
 * application layer. It is the primary asynchronous entry point for state changes in the
 * Account bounded context, adhering to CQRS principles by only triggering command-side logic.
 */

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AccountCommandService } from '../../application/services/account-command.service';

// --- Event Payload DTOs (Data Transfer Objects) ---
// These interfaces define the data contract for events consumed from other services.

interface UserCreatedEventPayload {
  userId: string;
  email: string;
  name: string;
}

interface PlaidItemCreatedEventPayload {
  userId: string;
  itemId: string;
  accessToken: string; // In a real system, this might be a one-time use token for security.
  institutionName: string;
}

interface TransactionsSyncedEventPayload {
  userId: string;
  itemId: string;
  transactions: any[]; // Raw transaction data from the source (e.g., Plaid)
  syncTimestamp: string;
}

interface TransactionBalanceUpdateEventPayload {
  transactionId: string;
  accountId: string;
  amount: number;
  currency: string;
  userId: string;
}

/**
 * @class AccountController
 * @description Acts as a Kafka consumer, translating domain events from other microservices
 * into commands for the application's core logic (the command service).
 */
@Controller()
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  /**
   * @constructor
   * @param {AccountCommandService} accountCommandService - Injects the application's command service port.
   */
  constructor(
    private readonly accountCommandService: AccountCommandService,
  ) {}

  /**
   * Handles the 'user.created' event from the UserService, triggering the creation
   * of a default account for the new user.
   * @param {UserCreatedEventPayload} event - The payload of the 'user.created' event.
   */
  @EventPattern('user.created')
  async handleUserCreated(@Payload() event: UserCreatedEventPayload): Promise<void> {
    this.logger.log(`Received 'user.created' event for userId: ${event.userId}`);
    try {
      await this.accountCommandService.createDefaultAccountForUser(event);
    } catch (error) {
      this.logger.error(`Failed to handle 'user.created' event for userId: ${event.userId}`, error.stack);
      // In a production system, this would trigger an alert and potentially a dead-letter queue.
    }
  }

  /**
   * Handles the 'plaid.item.created' event from the PlaidIntegrationService.
   * This event triggers the process of creating corresponding account aggregates in this service.
   * @param {PlaidItemCreatedEventPayload} event - The payload of the 'plaid.item.created' event.
   */
  @EventPattern('plaid.item.created')
  async handlePlaidItemCreated(@Payload() event: PlaidItemCreatedEventPayload): Promise<void> {
    this.logger.log(`Received 'plaid.item.created' event for userId: ${event.userId}, institution: ${event.institutionName}`);
    try {
      await this.accountCommandService.linkExternalInstitution(event);
    } catch (error) {
      this.logger.error(`Failed to handle 'plaid.item.created' event for userId: ${event.userId}`, error.stack);
    }
  }

  /**
   * Handles the 'transactions.synced' event from the PlaidIntegrationService.
   * This event triggers balance updates on the relevant account aggregates.
   * @param {TransactionsSyncedEventPayload} event - The payload of the 'transactions.synced' event.
   */
  @EventPattern('transactions.synced')
  async handleTransactionsSynced(@Payload() event: TransactionsSyncedEventPayload): Promise<void> {
    this.logger.log(`Received 'transactions.synced' event for userId: ${event.userId}, item: ${event.itemId}.`);
    try {
      await this.accountCommandService.processSyncedTransactions(event);
    } catch (error) {
      this.logger.error(`Failed to handle 'transactions.synced' event for userId: ${event.userId}`, error.stack);
    }
  }

  /**
   * Handles the 'transaction.debited' event from the TransactionsService.
   * This event is a core part of an event-sourced saga, triggering a debit command on the Account aggregate.
   * @param {TransactionBalanceUpdateEventPayload} event - The event payload.
   */
  @EventPattern('transaction.debited')
  async handleTransactionDebited(@Payload() event: TransactionBalanceUpdateEventPayload): Promise<void> {
    this.logger.log(`Received 'transaction.debited' event for accountId: ${event.accountId}, amount: ${event.amount}`);
    try {
      await this.accountCommandService.debitAccount(event.accountId, event.amount, event.transactionId);
    } catch (error) {
      this.logger.error(`Failed to handle 'transaction.debited' event for accountId: ${event.accountId}`, error.stack);
    }
  }

  /**
   * Handles the 'transaction.credited' event from the TransactionsService.
   * This event triggers a credit command on the Account aggregate.
   * @param {TransactionBalanceUpdateEventPayload} event - The event payload.
   */
  @EventPattern('transaction.credited')
  async handleTransactionCredited(@Payload() event: TransactionBalanceUpdateEventPayload): Promise<void> {
    this.logger.log(`Received 'transaction.credited' event for accountId: ${event.accountId}, amount: ${event.amount}`);
    try {
      await this.accountCommandService.creditAccount(event.accountId, event.amount, event.transactionId);
    } catch (error) {
      this.logger.error(`Failed to handle 'transaction.credited' event for accountId: ${event.accountId}`, error.stack);
    }
  }

  /**
   * Handles the 'transaction.refunded' event from the TransactionsService.
   * This event represents a compensation action in a saga, triggering a refund (credit) command.
   * @param {TransactionBalanceUpdateEventPayload} event - The event payload.
   */
  @EventPattern('transaction.refunded')
  async handleTransactionRefunded(@Payload() event: TransactionBalanceUpdateEventPayload): Promise<void> {
    this.logger.log(`Received 'transaction.refunded' event for accountId: ${event.accountId}, amount: ${event.amount}`);
    try {
      await this.accountCommandService.refundAccount(event.accountId, event.amount, event.transactionId);
    } catch (error) {
      this.logger.error(`Failed to handle 'transaction.refunded' event for accountId: ${event.accountId}`, error.stack);
    }
  }
}
