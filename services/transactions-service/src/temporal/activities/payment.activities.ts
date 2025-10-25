/**
 * @file services/transactions-service/src/temporal/activities/payment.activities.ts
 * @description Defines the Temporal Activities for the multi-step payment processing workflow.
 *
 * Each function in this file represents a single, idempotent unit of work (an Activity) that can be orchestrated
 * by a Temporal Workflow. These activities encapsulate interactions with external services, databases, or APIs.
 * This approach allows the workflow logic to be durable, reliable, and decoupled from the implementation
 * details of each step, adhering to Hexagonal Architecture principles where activities are inbound adapters to the application's core logic.
 */

import { TransactionService } from '../../transaction/transaction.service';

// =============================================================================
// ACTIVITY INPUT/OUTPUT INTERFACES
// =============================================================================

/**
 * @interface AccountActivityInput
 * @description Defines the input structure for activities that interact with a financial account.
 * @property {string} accountId - The unique identifier of the target account.
 * @property {number} amount - The monetary amount for the operation.
 * @property {string} transactionId - The unique ID for the transaction, used for idempotency.
 */
export interface AccountActivityInput {
  accountId: string;
  amount: number;
  transactionId: string;
}

/**
 * @interface UpdateStatusInput
 * @description Defines the input structure for the activity that updates a transaction's status.
 * @property {string} transactionId - The unique ID of the transaction to update.
 * @property {string} status - The new status to set for the transaction.
 * @property {string} [error] - An optional error message if the status is a failure state.
 */
export interface UpdateStatusInput {
  transactionId: string;
  status: 'PROCESSING_DEBIT' | 'PROCESSING_CREDIT' | 'COMPLETED' | 'CREDIT_FAILED' | 'REFUNDING' | 'REFUNDED' | 'FAILED';
  error?: string;
}

// =============================================================================
// ACTIVITIES FACTORY
// =============================================================================

/**
 * Creates an object containing the Temporal Activities for the payment workflow.
 * This factory function allows for dependency injection of NestJS services (like TransactionService)
 * into the activities. This is a common pattern for integrating Temporal with a DI framework.
 *
 * @param {TransactionService} transactionService - An instance of the TransactionService, which contains the core business logic.
 * @returns {object} An object containing all activity functions for the payment workflow.
 */
export function createActivities(transactionService: TransactionService) {
  return {
    /**
     * Activity: Debits a specified amount from an account.
     * This is an idempotent operation that would typically trigger a command to an external 'accounts-service'.
     * @param {AccountActivityInput} input - Contains accountId, amount, and transactionId for idempotency.
     * @returns {Promise<void>}
     */
    async debitAccount(input: AccountActivityInput): Promise<void> {
      console.log(`[Activity] Debiting ${input.amount} from account ${input.accountId} for transaction ${input.transactionId}`);
      // In a real CQRS system, this would dispatch a `DebitAccountCommand`.
      await transactionService.debitAccount(input.accountId, input.amount, input.transactionId);
      console.log(`[Activity] Debit successful for account ${input.accountId}.`);
    },

    /**
     * Activity: Credits a specified amount to an account.
     * This is also an idempotent operation.
     * @param {AccountActivityInput} input - Contains accountId, amount, and transactionId for idempotency.
     * @returns {Promise<void>}
     */
    async creditAccount(input: AccountActivityInput): Promise<void> {
      console.log(`[Activity] Crediting ${input.amount} to account ${input.accountId} for transaction ${input.transactionId}`);
      await transactionService.creditAccount(input.accountId, input.amount, input.transactionId);
      console.log(`[Activity] Credit successful for account ${input.accountId}.`);
    },

    /**
     * Activity: Refunds a previously debited amount to an account.
     * This is the compensation activity for the `debitAccount` operation in the Saga pattern.
     * @param {AccountActivityInput} input - Contains accountId, amount, and transactionId for idempotency.
     * @returns {Promise<void>}
     */
    async refundAccount(input: AccountActivityInput): Promise<void> {
      console.log(`[Activity] [COMPENSATION] Refunding ${input.amount} to account ${input.accountId} for transaction ${input.transactionId}`);
      await transactionService.refundAccount(input.accountId, input.amount, input.transactionId);
      console.log(`[Activity] [COMPENSATION] Refund successful for account ${input.accountId}.`);
    },

    /**
     * Activity: Updates the status of the transaction in the read model.
     * This provides visibility into the progress of the workflow.
     * @param {UpdateStatusInput} input - Contains the transactionId, new status, and an optional error message.
     * @returns {Promise<void>}
     */
    async updateTransactionStatus(input: UpdateStatusInput): Promise<void> {
      console.log(`[Activity] Updating status for transaction ${input.transactionId} to ${input.status}`);
      await transactionService.updateTransactionReadModelStatus(
        input.transactionId,
        input.status,
        input.error,
      );
      console.log(`[Activity] Status updated for transaction ${input.transactionId}.`);
    },
  };
}
