import { proxyActivities, ApplicationFailure, CancellationScope } from '@temporalio/workflow';
// This import is a type-only import. The actual activity functions are registered with the Worker.
import type * as activities from '../activities/payment.activities';

/**
 * @interface PaymentWorkflowInput
 * @description Defines the required inputs for initiating the payment workflow.
 * This serves as the public contract for starting this workflow.
 * @property {string} transactionId - A unique idempotency key for the payment operation.
 * @property {string} sourceAccountId - The ID of the account from which funds will be debited.
 * @property {string} destinationAccountId - The ID of the account to which funds will be credited.
 * @property {number} amount - The amount of money to transfer.
 */
export interface PaymentWorkflowInput {
  transactionId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
}

/**
 * @interface PaymentWorkflowResult
 * @description Defines the final result object returned by the payment workflow upon successful completion.
 * If the workflow fails, it will throw an error instead of returning.
 * @property {string} transactionId - The ID of the transaction that was processed.
 * @property {'COMPLETED'} status - The final status of the transaction.
 */
export interface PaymentWorkflowResult {
  transactionId: string;
  status: 'COMPLETED';
}

// Configure the activities with timeouts and a standard retry policy.
// `nonRetryableErrorTypes` are critical to prevent retrying on business logic failures
// (e.g., insufficient funds), which would never succeed.
const { debitAccount, creditAccount, updateTransactionStatus } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '1 minute',
    nonRetryableErrorTypes: ['AccountNotFound', 'InsufficientFunds', 'TransactionAlreadyProcessed'],
  },
});

// Configure a separate, more aggressive retry policy for compensation activities (Saga pattern).
// If the debit succeeded but the credit failed, we must ensure the refund succeeds.
const compensationActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes', // Longer timeout for this critical step.
  retry: {
    initialInterval: '5 seconds',
    backoffCoefficient: 2,
    maximumInterval: '2 minutes',
    maximumAttempts: 10, // Attempt to refund up to 10 times.
  },
});

/**
 * @function paymentWorkflow
 * @description Orchestrates a multi-step payment transfer using the Saga pattern with compensation.
 * This durable, stateful workflow ensures that a payment either completes successfully (debit and credit)
 * or is fully rolled back (debit is refunded), maintaining data consistency across distributed services.
 *
 * @workflow
 * @param {PaymentWorkflowInput} input - The details of the payment to be processed.
 * @returns {Promise<PaymentWorkflowResult>} The final status of the transaction if successful.
 * @throws {ApplicationFailure} If the saga fails and cannot be compensated, or if the debit fails.
 */
export async function paymentWorkflow(input: PaymentWorkflowInput): Promise<PaymentWorkflowResult> {
  const { transactionId, sourceAccountId, destinationAccountId, amount } = input;

  // This variable will hold the identifier for the debit transaction, to be used for compensation if needed.
  let chargeId: string | undefined;

  try {
    // --- Saga Step 1: Debit the source account. ---
    await updateTransactionStatus({ transactionId, status: 'PROCESSING_DEBIT' });
    const debitResult = await debitAccount({ accountId: sourceAccountId, amount, transactionId });
    chargeId = debitResult.chargeId;

    // --- Saga Step 2: Credit the destination account. ---
    await updateTransactionStatus({ transactionId, status: 'PROCESSING_CREDIT' });
    await creditAccount({ accountId: destinationAccountId, amount, transactionId });

    // --- Saga Success: Mark transaction as complete. ---
    await updateTransactionStatus({ transactionId, status: 'COMPLETED' });
    return { transactionId, status: 'COMPLETED' };
    
  } catch (err) {
    const originalError = ApplicationFailure.fromError(err);

    // --- Saga Step 3 (Compensation): A step has failed. ---
    // If chargeId is defined, it means the debit succeeded but a later step (i.e., credit) failed.
    // We must now execute the compensation logic to refund the debit.
    if (chargeId) {
      await updateTransactionStatus({
        transactionId,
        status: 'CREDIT_FAILED_COMPENSATING',
        error: originalError.message,
      });

      // The compensation logic (refund) is critical and must not be cancelled, even if the workflow is cancelled.
      await CancellationScope.nonCancellable(async () => {
        await updateTransactionStatus({ transactionId, status: 'REFUNDING_DEBIT' });
        try {
          await compensationActivities.refundAccount({ chargeId, transactionId });
          await updateTransactionStatus({ transactionId, status: 'REFUNDED' });
        } catch (refundError) {
            const refundFailure = ApplicationFailure.fromError(refundError);
            // This is a critical failure that requires manual intervention.
            await updateTransactionStatus({
                transactionId,
                status: 'COMPENSATION_FAILED',
                error: `Original error: ${originalError.message}. Refund error: ${refundFailure.message}`,
            });
            // Throw a new, more severe error indicating that compensation failed.
            throw ApplicationFailure.newError(
                'Payment saga failed and compensation could not be completed. Manual intervention required.',
                'CompensationFailure',
                { originalError: originalError.message, refundError: refundFailure.message }
            );
        }
      });
    }
    
    // --- Saga Failure: Mark transaction as failed and fail the workflow. ---
    await updateTransactionStatus({
      transactionId,
      status: 'FAILED',
      error: originalError.message,
    });
    
    // Re-throwing the error is important to mark the workflow execution as 'Failed' in Temporal.
    throw originalError;
  }
}
