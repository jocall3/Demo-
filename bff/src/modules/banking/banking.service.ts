import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  ServiceUnavailableException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client,
  Connection,
  WorkflowHandle,
  WorkflowIdReusePolicy,
  WorkflowExecutionAlreadyStartedError,
} from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';

// Workflow input and result types would ideally be in a shared library,
// representing the contract between the API adapter and the application core (workflow).
export interface SendMoneyWorkflowInput {
  /**
   * The unique idempotency key for this transaction, preventing duplicate processing.
   * This is used to construct the Workflow ID.
   * @type {string}
   */
  transactionId: string;
  /**
   * The ID of the user initiating the transfer.
   * @type {string}
   */
  userId: string;
  /**
   * The identifier of the source account for the funds.
   * @type {string}
   */
  sourceAccountId: string;
  /**
   * A string identifying the destination (e.g., account number, user tag).
   * @type {string}
   */
  destination: string;
  /**
   * The amount to be transferred.
   * @type {number}
   */
  amount: number;
  /**
   * The ISO 4217 currency code.
   * @type {string}
   */
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
 * dedicated workflow orchestration engine (Temporal), adhering to Hexagonal Architecture principles.
 *
 * When a mutation (e.g., `sendMoney`) is triggered, this service's responsibility is to:
 * 1.  Validate and prepare the initial input.
 * 2.  Connect to the workflow engine.
 * 3.  Start a durable, stateful workflow (e.g., `sendMoneyWorkflow`) which represents the application's core logic.
 * 4.  Return an identifier (workflow ID) to the client for tracking.
 *
 * This decouples the synchronous API request from the asynchronous, multi-step,
 * and fallible process of a financial transaction, making the system more resilient and observable.
 */
@Injectable()
export class BankingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BankingService.name);
  private temporalClient: Client;
  private connection: Connection;
  private readonly taskQueue: string;

  constructor(private configService: ConfigService) {
    this.taskQueue = this.configService.get<string>('TEMPORAL_BANKING_TASK_QUEUE', 'banking-workflows');
  }

  async onModuleInit() {
    try {
      const temporalAddress = this.configService.getOrThrow<string>('TEMPORAL_ADDRESS');
      this.connection = await Connection.connect({
        address: temporalAddress,
        // In production, TLS configuration from ConfigService would be mandatory.
        // tls: this.configService.get('temporal.tlsOptions')
      });
      this.temporalClient = new Client({
        connection: this.connection,
        namespace: this.configService.get<string>('TEMPORAL_NAMESPACE', 'default'),
      });
      this.logger.log(`Successfully connected to Temporal workflow engine at ${temporalAddress}`);
    } catch (err) {
      this.logger.error('Failed to connect to Temporal. Banking workflow features will be unavailable.', err.stack);
    }
  }

  async onModuleDestroy() {
    await this.connection?.close();
    this.logger.log('Temporal client connection closed.');
  }

  /**
   * Initiates a 'sendMoneyWorkflow' to process a payment asynchronously.
   * This method acts as a "command" in a CQRS pattern, initiating a state change via a workflow.
   *
   * @param input - The details of the money transfer. An optional `idempotencyKey` can be provided by the client.
   * @returns An object containing the workflowId for tracking.
   */
  async sendMoney(input: Omit<SendMoneyWorkflowInput, 'transactionId'> & { idempotencyKey?: string }): Promise<{ workflowId: string }> {
    if (!this.temporalClient) {
      throw new ServiceUnavailableException('Payment processing service is currently unavailable.');
    }

    const transactionId = input.idempotencyKey || uuidv4();
    const workflowId = `payment-${transactionId}`;

    this.logger.log(`Attempting to start 'sendMoneyWorkflow' with ID: ${workflowId} on task queue '${this.taskQueue}'`);

    try {
      // Start the workflow. This is a non-blocking RPC to the Temporal frontend.
      const handle: WorkflowHandle<SendMoneyWorkflowResult> = await this.temporalClient.workflow.start('sendMoneyWorkflow', {
        taskQueue: this.taskQueue,
        workflowId: workflowId,
        args: [{ ...input, transactionId }],
        // This policy ensures idempotency. If a workflow with this ID already exists,
        // it will throw a WorkflowExecutionAlreadyStartedError instead of creating a duplicate.
        workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
        // Options like execution timeout or retry policies can be defined here.
        workflowExecutionTimeout: '5 minutes',
      });

      this.logger.log(`Workflow started successfully for transaction ${transactionId}`);
      return { workflowId: handle.workflowId };
    } catch (error) {
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        this.logger.warn(`Idempotency check passed: Workflow with ID '${workflowId}' already exists.`);
        // Return a conflict exception to inform the client that the request was already received.
        throw new ConflictException(`A payment with this idempotency key (${transactionId}) is already in progress.`);
      }
      this.logger.error(`Failed to start 'sendMoneyWorkflow' for user ${input.userId}`, error.stack);
      throw new InternalServerErrorException('Could not initiate the payment process.');
    }
  }

  /**
   * Retrieves the current status or result of a previously started workflow.
   * This method acts as a "query" to get the state of a long-running operation.
   * @param workflowId The unique ID of the workflow to query.
   * @returns The result of the workflow if completed.
   */
  async getSendMoneyStatus(workflowId: string): Promise<SendMoneyWorkflowResult> {
    if (!this.temporalClient) {
      throw new ServiceUnavailableException('Payment processing service is currently unavailable.');
    }
    
    this.logger.log(`Querying status for workflow: ${workflowId}`);
    try {
        const handle = this.temporalClient.workflow.getHandle(workflowId);
        // `result()` will wait for the workflow to complete.
        // For polling, you might use `describe()` to get the current status without waiting for completion.
        return await handle.result();
    } catch (error) {
        this.logger.error(`Error retrieving result for workflow ${workflowId}`, error.stack);
        throw new InternalServerErrorException(`Could not retrieve status for payment ${workflowId}.`);
    }
  }
}
