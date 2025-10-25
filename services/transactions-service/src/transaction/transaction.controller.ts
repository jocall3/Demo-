import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TransactionService } from './transaction.service';
import { NewTransactionsPayload } from './dto/new-transactions.payload';

/**
 * @class TransactionController
 * @description Handles incoming asynchronous events related to transactions from the message bus (Kafka).
 * In this event-driven architecture, this controller acts as a primary inbound adapter for events
 * that affect the transaction domain's read model or trigger sagas. It explicitly does NOT expose
 * synchronous HTTP/gRPC endpoints; all external communication is asynchronous and event-based.
 */
@Controller()
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(private readonly transactionService: TransactionService) {}

  /**
   * @method handleTransactionsSynced
   * @description Subscribes to the 'transactions.synced' event topic on the message bus.
   * This event is typically published by an upstream service (e.g., Plaid Integration Service)
   * after successfully fetching new transactions from an external financial institution.
   * 
   * In a CQRS/Event Sourcing context, this event triggers the update of the local read model
   * (projection) for efficient querying of transaction data. The controller delegates the
   * actual processing and persistence of these transactions to the `TransactionService`.
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
      // The service layer acts as the event handler, responsible for updating the read model.
      await this.transactionService.updateReadModelWithNewTransactions(payload);
      this.logger.log(
        `Successfully updated read model with transactions for userId: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process 'transactions.synced' event for userId: ${payload.userId}`,
        error.stack,
      );
      // In a robust production system, events that fail processing for the read model
      // would be sent to a Dead-Letter Queue (DLQ) for manual intervention or retry.
    }
  }

  /**
   * @method handleAccountRemoved
   * @description Subscribes to the 'account.removed' event topic on the message bus.
   * This event is published by the `AccountsService` when a user unlinks a bank account.
   * 
   * This handler is responsible for reacting to the event by initiating the deletion of
   * all associated transaction data from this service's read model, ensuring data consistency.
   *
   * @param {object} payload - The data payload containing the `userId` and `accountId`.
   */
  @EventPattern('account.removed')
  async handleAccountRemoved(
    @Payload() { userId, accountId }: { userId: string; accountId: string },
  ): Promise<void> {
    this.logger.log(`Received 'account.removed' event for accountId: ${accountId}. Removing associated transactions from read model.`);
    try {
      // The service layer handles the logic for removing data from the read model.
      await this.transactionService.deleteTransactionsFromReadModel(userId, accountId);
      this.logger.log(
        `Successfully removed transactions for accountId: ${accountId} from read model.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process 'account.removed' event for accountId: ${accountId}`,
        error.stack,
      );
      // Log and potentially send to DLQ for robust error handling.
    }
  }
}
