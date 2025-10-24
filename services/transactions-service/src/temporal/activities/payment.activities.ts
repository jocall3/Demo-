/**
 * @file services/transactions-service/src/temporal/activities/payment.activities.ts
 * @description Defines the Temporal Activities for the multi-step payment processing workflow.
 *
 * Each function in this file represents a single, idempotent unit of work (an Activity) that can be orchestrated
 * by a Temporal Workflow. These activities encapsulate interactions with external services, databases, or APIs.
 * This approach allows the workflow logic to be durable, reliable, and decoupled from the implementation
 * details of each step.
 */

// NOTE: In a real-world NestJS + Temporal integration, services like TransactionService
// would be injected into an Activities class. For this file, we simulate these interactions
// to focus on the activity definitions themselves.

/**
 * Defines the data structure passed between payment activities.
 */
export interface PaymentDetails {
  transactionId: string;
  sourceUserId: string;
  destinationUserId: string;
  amount: number;
  currency: string;
}

/**
 * Debits the specified amount from the source user's account.
 * This is an idempotent activity that can be safely retried.
 * @param details - The details of the payment.
 * @returns A confirmation string (e.g., a charge ID) for potential compensation.
 */
export async function debitSourceAccount(details: PaymentDetails): Promise<string> {
  console.log(`[Activity] Debiting ${details.amount} ${details.currency} from user ${details.sourceUserId} for transaction ${details.transactionId}`);

  // Simulate an idempotent call to an external accounts service.
  // If this service were called again with the same transactionId, it should not double-charge.
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate a potential transient failure. Temporal will retry this activity based on the workflow's retry policy.
  if (Math.random() < 0.1) {
    console.error('[Activity] Failed to connect to banking provider for debit.');
    throw new Error('Failed to connect to banking provider for debit.');
  }

  const chargeId = `charge_${details.transactionId}`;
  console.log(`[Activity] Debit successful. Charge ID: ${chargeId}`);
  return chargeId;
}

/**
 * The compensation activity for `debitSourceAccount`.
 * This will be executed by a Saga if a subsequent activity in the workflow fails, ensuring the user is refunded.
 * @param chargeId - The charge ID returned by the `debitSourceAccount` activity.
 * @param transactionId - The original transaction ID for logging and tracing.
 */
export async function refundSourceAccount(chargeId: string, transactionId: string): Promise<void> {
  console.log(`[Activity] [COMPENSATION] Refunding charge ${chargeId} for transaction ${transactionId}`);

  // Simulate an idempotent call to the accounts service to issue a refund.
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`[Activity] [COMPENSATION] Refund for transaction ${transactionId} processed successfully.`);
}

/**
 * Credits the specified amount to the destination user's account.
 * @param details - The details of the payment.
 * @returns A confirmation string (e.g., a credit transaction ID).
 */
export async function creditDestinationAccount(details: PaymentDetails): Promise<string> {
  console.log(`[Activity] Crediting ${details.amount} ${details.currency} to user ${details.destinationUserId} for transaction ${details.transactionId}`);

  // Simulate calling an external accounts service.
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate a higher chance of failure to demonstrate the Saga's compensation logic.
  if (Math.random() < 0.3) {
    console.error('[Activity] Failed to credit destination account. The receiving bank is offline.');
    throw new Error('Failed to credit destination account. The receiving bank is offline.');
  }

  const creditId = `credit_${details.transactionId}`;
  console.log(`[Activity] Credit successful. Credit ID: ${creditId}`);
  return creditId;
}

/**
 * Records the final status of the transaction in the local database.
 * This is typically one of the last steps in the workflow to ensure transactional integrity.
 * @param details - The full details of the transaction to record, including its final status.
 */
export async function recordTransaction(details: PaymentDetails & { status: 'COMPLETED' | 'FAILED' }): Promise<void> {
  console.log(`[Activity] Recording transaction ${details.transactionId} in database with status ${details.status}`);

  // Simulate writing to the transactions-service's own database using its service.
  await new Promise(resolve => setTimeout(resolve, 200));

  console.log(`[Activity] Transaction ${details.transactionId} recorded successfully.`);
}

/**
 * Sends a notification to a user regarding the transaction status.
 * @param userId - The ID of the user to notify.
 * @param message - The message to send.
 */
export async function notifyUser(userId: string, message: string): Promise<void> {
  console.log(`[Activity] Notifying user ${userId}: "${message}"`);

  // Simulate emitting an event to a notifications service or calling a notification API.
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log(`[Activity] Notification sent to user ${userId}.`);
}
