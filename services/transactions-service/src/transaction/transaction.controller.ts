import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TransactionService } from './transaction.service';
import { NewTransactionsPayload } from './dto/new-transactions.payload';

/**
 * @class TransactionController
 * @description Handles incoming asynchronous events related to transactions from the message bus.
 * In an event-driven architecture, this controller acts as the primary entry point
 * for commands and events from other microservices, replacing a traditional REST API for inter-service communication.
 */
@Controller()
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(private readonly transactionService: TransactionService) {}

  /**
   * @method handleTransactionsSynced
   * @description Subscribes to the 'transactions.synced' event topic on the message bus.
   * This event is expected to be published by a service responsible for data ingestion,
   * such as a PlaidIntegrationService, after fetching new transactions from an external source.
   *
   * The controller receives the payload and delegates the processing and persistence
   * of these new transactions to the TransactionService.
   *
   * @param {NewTransactionsPayload} payload - The data payload containing the user ID and an array of new transactions.
   */
  @EventPattern('transactions.synced')
  async handleTransactionsSynced(
    @Payload() payload: NewTransactionsPayload,
  ): Promise<void> {
    this.logger.log(
      `Received 'transactions.synced' event for userId: ${payload.userId}. Processing ${payload.transactions.length} transactions.`,
    );
    try {
      // The service layer contains the business logic to process, enrich, and save the transactions.
      await this.transactionService.createMany(payload);
      this.logger.log(
        `Successfully processed transactions for userId: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process 'transactions.synced' event for userId: ${payload.userId}`,
        error.stack,
      );
      // In a production system, this might push the event to a dead-letter queue (DLQ) for later inspection.
    }
  }

  /**
   * @method handleAccountRemoved
   * @description Subscribes to the 'account.removed' event topic. This event is published
   * when a user unlinks a bank account. This handler is responsible for triggering the
   * deletion of all transactions associated with that account.
   *
   * @param {object} payload - The data payload containing `userId` and `accountId`.
   */
  @EventPattern('account.removed')
  async handleAccountRemoved(
    @Payload() { userId, accountId }: { userId: string; accountId: string },
  ): Promise<void> {
    this.logger.log(`Received 'account.removed' event for accountId: ${accountId}.`);
    try {
      await this.transactionService.deleteByAccountId({ userId, accountId });
      this.logger.log(
        `Successfully deleted transactions for accountId: ${accountId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process 'account.removed' event for accountId: ${accountId}`,
        error.stack,
      );
    }
  }
}
