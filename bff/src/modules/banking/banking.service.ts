import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Connection, WorkflowHandle } from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';

// Workflow input and result types should be shared between the client and the worker.
// These are defined here for clarity.
export interface SendMoneyWorkflowInput {
  transactionId: string; // Idempotency key
  userId: string;
  sourceAccountId: string;
  destination: string;
  amount: number;
  currency: string;
}

export interface SendMoneyWorkflowResult {
  transactionId: string;
  status: 'COMPLETED' | 'FAILED';
  chargeId?: string; // e.g., from Stripe
  failureReason?: string;
}

/**
 * @Injectable()
 * BankingService in the BFF (API Gateway)
 *
 * ARCHITECTURAL REFACTOR:
 * This service's role has been transformed. It no longer contains direct business logic
 * for complex operations like money transfers. Instead, it acts as a client to a
 * dedicated workflow orchestration engine (e.g., Temporal).
 *
 * When a mutation (e.g., `sendMoney`) is triggered from the frontend, this service's responsibility
 * is to:
 * 1. Validate and prepare the initial input.
 * 2. Connect to the workflow engine.
 * 3. Start a durable, stateful workflow (e.g., `sendMoneyWorkflow`).
 * 4. Return an identifier (like a workflow ID) to the client so the status of the long-running
 *    operation can be tracked if necessary.
 *
 * This decouples the synchronous API request from the potentially long-running, multi-step,
 * and fallible process of a financial transaction, making the system more resilient and observable.
 */
@Injectable()
export class BankingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BankingService.name);
  private temporalClient: Client;
  private connection: Connection;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.connection = await Connection.connect({
        address: this.configService.get<string>('TEMPORAL_ADDRESS', 'localhost:7233'),
        // In production, TLS configuration would be mandatory.
        // tls: {}
      });
      this.temporalClient = new Client({
        connection: this.connection,
        // It's good practice to set a namespace for isolation.
        namespace: this.configService.get<string>('TEMPORAL_NAMESPACE', 'default'),
      });
      this.logger.log('Successfully connected to Temporal workflow engine.');
    } catch (err) {
      this.logger.error('Failed to connect to Temporal.', err.stack);
      // Depending on the application's requirements, you might want to throw
      // an error here to prevent the service from starting in a broken state.
    }
  }

  async onModuleDestroy() {
    await this.connection?.close();
    this.logger.log('Temporal client connection closed.');
  }

  /**
   * Initiates a 'sendMoneyWorkflow' to process a payment asynchronously.
   *
   * @param input - The details of the money transfer.
   * @returns An object containing the workflowId for tracking.
   */
  async sendMoney(input: Omit<SendMoneyWorkflowInput, 'transactionId'>): Promise<{ workflowId: string }> {
    if (!this.temporalClient) {
      this.logger.error('Cannot start sendMoney workflow: Temporal client is not connected.');
      throw new Error('Payment processing service is currently unavailable.');
    }

    const transactionId = uuidv4();
    const workflowId = `payment-${transactionId}`;

    this.logger.log(`Starting 'sendMoneyWorkflow' with ID: ${workflowId}`);

    try {
      // Start the workflow. The `start` method is non-blocking. It returns a handle
      // to the workflow execution immediately. The workflow engine now takes over.
      const handle: WorkflowHandle<SendMoneyWorkflowResult> = await this.temporalClient.workflow.start('sendMoneyWorkflow', {
        taskQueue: 'banking-workflows',
        workflowId: workflowId,
        args: [{ ...input, transactionId }],
        // Options like execution timeout or retry policies can be defined here.
        // workflowExecutionTimeout: '5 minutes',
      });

      this.logger.log(`Workflow started successfully for transaction ${transactionId}`);
      return { workflowId: handle.workflowId };
    } catch (error) {
      this.logger.error(`Failed to start 'sendMoneyWorkflow' for user ${input.userId}`, error.stack);
      throw new Error('Could not initiate the payment process.');
    }
  }

  /**
   * Retrieves the current status or result of a previously started workflow.
   * @param workflowId The unique ID of the workflow to query.
   * @returns The result of the workflow if completed, or throws an error if it failed or is still running.
   */
  async getSendMoneyStatus(workflowId: string): Promise<SendMoneyWorkflowResult> {
    if (!this.temporalClient) {
      this.logger.error('Cannot get workflow status: Temporal client is not connected.');
      throw new Error('Payment processing service is currently unavailable.');
    }
    
    this.logger.log(`Querying status for workflow: ${workflowId}`);
    try {
        const handle = this.temporalClient.workflow.getHandle(workflowId);
        // `result()` will wait for the workflow to complete.
        // For polling, you might use `describe()` to get the current status without waiting.
        return await handle.result();
    } catch (error) {
        this.logger.error(`Error retrieving result for workflow ${workflowId}`, error.stack);
        throw new Error(`Could not retrieve status for payment ${workflowId}.`);
    }
  }
}
