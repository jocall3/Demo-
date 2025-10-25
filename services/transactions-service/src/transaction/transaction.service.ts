import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client as TemporalClient } from '@temporalio/client';
import { ClientKafka } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { paymentWorkflow } from '../temporal/workflows/payment.workflow';
import { TEMPORAL_CLIENT } from '../temporal/temporal.constants';
import { KAFKA_PRODUCER_CLIENT } from '../event-bus/event-bus.module';

// =============================================================================
// Domain Events (Conceptual - These would typically be in a shared 'events' library)
// These define the structure of events published to Kafka.
// =============================================================================

/**
 * @description Event emitted when a payment request is initiated and accepted by the system.
 */
interface PaymentInitiatedEvent {
  transactionId: string; // Corresponds to the workflow ID
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  timestamp: string;
  status: 'PENDING';
}

// =============================================================================
// Transaction Service
// =============================================================================

/**
 * @Injectable
 * Service responsible for handling commands related to financial transactions.
 *
 * This service implements the command-side of the CQRS pattern. It does NOT
 * directly interact with a database for state modification. Instead, it:
 * 1. Validates incoming commands.
 * 2. Publishes immutable domain events to an event store (Kafka) representing
 *    the intent and outcome of an operation.
 * 3. Initiates durable workflows (Temporal) for complex, long-running business processes (Sagas).
 *
 * Query-side responsibilities (fetching transaction lists or details) are handled by
 * separate read models, which are built asynchronously by consuming events from Kafka.
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @Inject(TEMPORAL_CLIENT) private readonly temporalClient: TemporalClient,
    @Inject(KAFKA_PRODUCER_CLIENT) private readonly eventPublisher: ClientKafka,
  ) {}

  /**
   * Initiates a multi-step payment process as a durable, stateful workflow.
   * This method acts as a command handler, publishing a `PaymentInitiatedEvent`
   * and starting a Temporal workflow to orchestrate the payment saga.
   *
   * @param paymentDetails The details of the payment command.
   * @returns A promise that resolves with the unique workflow ID for tracking.
   */
  async initiatePayment(paymentDetails: InitiatePaymentDto): Promise<string> {
    const { fromAccountId, toAccountId, amount, currency, userId } = paymentDetails;
    const workflowId = `payment-${uuidv4()}`; // Unique ID for the workflow and initial transaction

    this.logger.log(
      `Received 'initiatePayment' command for user ${userId}. Starting workflow ${workflowId}.`,
    );

    // 1. Publish a PaymentInitiatedEvent to the event store (Kafka).
    // This event signifies that the payment request has been accepted and processing has begun.
    const paymentInitiatedEvent: PaymentInitiatedEvent = {
      transactionId: workflowId,
      userId: userId,
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      amount: amount,
      currency: currency,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
    };

    // `emit` returns an Observable, we need to convert it to a Promise for async/await.
    await this.eventPublisher.emit('payment.initiated', JSON.stringify(paymentInitiatedEvent)).toPromise();
    this.logger.log(`Published 'payment.initiated' event for workflow ${workflowId} to Kafka.`);

    // 2. Start the Temporal workflow execution.
    // The workflow will coordinate the actual debit, credit, and subsequent event publishing.
    const handle = await this.temporalClient.workflow.start(paymentWorkflow, {
      taskQueue: 'payments-task-queue', // This should match the task queue the worker is listening on
      workflowId: workflowId,
      args: [paymentDetails],
      // Options like workflow execution timeout, retry policies can be defined here.
      // workflowExecutionTimeout: '5 minutes',
      // retry: { ... }
    });

    this.logger.log(`Temporal workflow ${handle.workflowId} started successfully.`);

    // 3. Return the workflowId to the caller for tracking.
    return handle.workflowId;
  }
}
