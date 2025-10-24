import { proxyActivities, ApplicationFailure, CancellationScope } from '@temporalio/workflow';
// Assuming an activities file exists at ../activities/payment.activities.ts
import type * as activities from '../activities/payment.activities';

/**
 * Input for the paymentWorkflow.
 */
export interface PaymentWorkflowInput {
  transactionId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
}

/**
 * Result of the paymentWorkflow.
 */
export interface PaymentWorkflowResult {
  transactionId: string;
  status: 'COMPLETED' | 'FAILED';
}

// Set up activities with a default retry policy.
// Non-retryable errors are crucial to prevent retrying on business logic failures (e.g., no funds).
const { debitAccount, creditAccount, updateTransactionStatus } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '1 minute',
    nonRetryableErrorTypes: ['AccountNotFound', 'InsufficientFunds', 'TransactionAlreadyProcessed'],
  },
});

// For compensation logic, we want a more robust policy to ensure it succeeds.
const compensationActivities = proxyActivities<typeof activities>({
    startToCloseTimeout: '5 minutes', // Longer timeout for critical compensation
    retry: {
      initialInterval: '5 seconds',
      maximumInterval: '2 minutes',
      maximumAttempts: 10, // Try hard to refund
    },
});


/**
 * paymentWorkflow orchestrates a multi-step payment transfer using the Saga pattern.
 * It ensures that either the transfer completes successfully, or it is fully rolled back,
 * maintaining data consistency across services.
 *
 * Workflow Steps:
 * 1. Mark transaction as processing.
 * 2. Debit the source account.
 * 3. Credit the destination account.
 * 4. If crediting fails, compensate by refunding the source account.
 * 5. Mark the transaction as either COMPLETED or FAILED.
 *
 * @param input - The details of the payment to be processed.
 * @returns The final status of the transaction.
 */
export async function paymentWorkflow(input: PaymentWorkflowInput): Promise<PaymentWorkflowResult> {
  const { transactionId, sourceAccountId, destinationAccountId, amount } = input;

  try {
    // 1. Debit money from the source account.
    await updateTransactionStatus({ transactionId, status: 'PROCESSING_DEBIT' });
    await debitAccount({ accountId: sourceAccountId, amount, transactionId });

    // 2. Try to credit money to the destination account.
    try {
      await updateTransactionStatus({ transactionId, status: 'PROCESSING_CREDIT' });
      await creditAccount({ accountId: destinationAccountId, amount, transactionId });

      await updateTransactionStatus({ transactionId, status: 'COMPLETED' });
      return { transactionId, status: 'COMPLETED' };
    } catch (creditError) {
      // 3. If crediting fails, start compensation (Saga pattern).
      const creditFailure = ApplicationFailure.fromError(creditError);
      await updateTransactionStatus({
        transactionId,
        status: 'CREDIT_FAILED',
        error: creditFailure.message,
      });

      // The compensation logic (refund) is critical and must not be cancelled.
      await CancellationScope.nonCancellable(async () => {
        await updateTransactionStatus({ transactionId, status: 'REFUNDING' });
        
        // Use the more robust activity proxy for the refund.
        await compensationActivities.refundAccount({ accountId: sourceAccountId, amount, transactionId });
        
        await updateTransactionStatus({ transactionId, status: 'REFUNDED' });
      });

      // The workflow has ultimately failed, but the system is in a consistent state.
      // We throw the original creditError to mark the workflow run as failed.
      throw creditFailure;
    }
  } catch (err) {
    // This top-level catch handles failures from the debit step or re-throws the failure from the credit step.
    const finalError = ApplicationFailure.fromError(err);
    await updateTransactionStatus({
      transactionId,
      status: 'FAILED',
      error: finalError.message,
    });

    return { transactionId, status: 'FAILED' };
  }
}
