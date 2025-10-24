import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/quantum-weaver.activities';

// Local type definitions until shared types are available in a library.
// These should mirror the types used in the `data` layer and other services.
export interface AIQuestion {
  question: string;
  category: 'Market' | 'Finance' | 'Operations';
}

export interface QuantumWeaverWorkflowInput {
  userId: string;
  businessPlan: string;
}

export interface QuantumWeaverWorkflowResult {
  feedback: string;
  questions: AIQuestion[];
}

// Configure the activities with timeouts and retry policies.
// The `proxyActivities` function creates a client-side stub that communicates with the Temporal service.
const { 
  generateFeedback,
  generateQuestions,
  notifyAnalysisCompleted,
  notifyAnalysisFailed
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes', // Total time for an activity to complete, including retries.
  // Retry policy for potentially flaky AI API calls.
  retry: {
    initialInterval: '2 seconds',
    backoffCoefficient: 2,
    maximumInterval: '30 seconds',
    // Do not retry on specific application failures that are unlikely to succeed on retry.
    nonRetryableErrorTypes: ['ApplicationFailure'],
  },
});

/**
 * Defines the Quantum Weaver business plan analysis workflow.
 * 
 * This workflow orchestrates a long-running, asynchronous saga that was previously handled
 * by event choreography. By using Temporal, we gain durability, statefulness, and visibility
 * into this critical business process.
 * 
 * The workflow executes the following steps:
 * 1. Generates high-level feedback on the business plan (Activity).
 * 2. Generates critical questions a VC might ask (Activity).
 * 3. Notifies other services of the completion or failure (Activities).
 * 
 * @param input - The input for the workflow, containing the userId and the business plan text.
 * @returns A promise that resolves with the analysis results upon successful completion.
 */
export async function quantumWeaverWorkflow(
  input: QuantumWeaverWorkflowInput
): Promise<QuantumWeaverWorkflowResult> {
  const { userId, businessPlan } = input;

  try {
    // The two main analysis activities can run in parallel as they don't depend on each other.
    // This improves the overall processing time.
    const [feedback, questions] = await Promise.all([
      generateFeedback(businessPlan),
      generateQuestions(businessPlan)
    ]);

    // Once the core analysis is complete, trigger a notification activity.
    // This activity is responsible for emitting an event (e.g., to Kafka) to inform other services.
    await notifyAnalysisCompleted({ userId, feedback, questions });

    return { feedback, questions };

  } catch (err) {
    // If any of the main activities fail after all retries, the catch block is executed.
    // Here, we can perform compensation logic or, in this case, notify of the failure.
    const errorMessage = (err as Error).message || 'An unknown error occurred during plan analysis.';
    
    await notifyAnalysisFailed({ userId, businessPlan, error: errorMessage });

    // Re-throwing the error is important to ensure the workflow execution is marked as 'Failed' in Temporal.
    throw err;
  }
}
