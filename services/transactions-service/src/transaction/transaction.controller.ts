import { Controller, Inject, Logger, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { Client as TemporalClient } from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';

import { paymentWorkflow } from '../temporal/workflows/payment.workflow';
import { TEMPORAL_CLIENT } from '../temporal/temporal.constants';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

/**
 * @class InitiatePaymentEventPayload
 * @description Data Transfer Object (DTO) for validating the payload of a 'payment.request.initiated' event.
 * Ensures that incoming event data conforms to the required structure before processing.
 */
export class InitiatePaymentEventPayload {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  sourceAccountId: string;

  @IsString()
  @IsNotEmpty()
  destinationAccountId: string; // Could be an account ID, IBAN, etc., depending on payment rail

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;
}

/**
 * @class TransactionController
 * @description An Input Adapter in the Hexagonal Architecture, responsible for handling
 * asynchronous events from the central message bus (Kafka). This controller translates
 * incoming events into commands that initiate long-running, durable business processes
 * (Sagas) orchestrated by a workflow engine (Temporal).
 *
 * This controller adheres to CQRS by only triggering command-side logic (starting workflows)
 * and does not expose any query endpoints. It is the asynchronous entry point for commands
 * into the transactions-service domain.
 */
@Controller()
export class TransactionController {
  private readonly logger = new Logger(TransactionController.name);

  constructor(
    @Inject(TEMPORAL_CLIENT) private readonly temporalClient: TemporalClient,
  ) {}

  /**
   * @method handlePaymentRequest
   * @description Subscribes to the 'payment.request.initiated' event topic. This event
   * can be emitted by other microservices (e.g., a bill-pay service) to request a
   * funds transfer. Upon receiving a valid event, this handler initiates the
   * `paymentWorkflow` in Temporal to orchestrate the payment saga.
   *
   * @param {InitiatePaymentEventPayload} payload - The validated event payload containing payment details.
   */
  @EventPattern('payment.request.initiated')
  async handlePaymentRequest(
    @Payload(new ValidationPipe()) payload: InitiatePaymentEventPayload,
  ): Promise<void> {
    const { userId, sourceAccountId, destinationAccountId, amount, currency } = payload;
    const workflowId = `payment-${uuidv4()}`; // Unique ID for the workflow and initial transaction

    this.logger.log(
      `Received 'payment.request.initiated' event. Starting workflow ${workflowId} for user ${userId}.`,
    );

    try {
      // Start the durable saga for payment processing. The workflow definition
      // contains the entire business logic, including debit, credit, and compensation steps.
      const handle = await this.temporalClient.workflow.start(paymentWorkflow, {
        taskQueue: 'payments-task-queue', // This should match the task queue the worker is listening on
        workflowId,
        args: [
          {
            transactionId: workflowId, // The workflow itself defines its input
            sourceAccountId,
            destinationAccountId,
            amount,
            currency,
            userId,
          },
        ],
        // Set a workflow execution timeout to prevent workflows from running indefinitely.
        workflowExecutionTimeout: '5 minutes',
      });

      this.logger.log(
        `Successfully started payment workflow with ID: ${handle.workflowId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start payment workflow for user ${userId} from event`,
        error.stack,
      );
      // In a production system, a failure to start a workflow would be a critical
      // error that should trigger an alert. The message would likely be routed
      // to a Dead-Letter Queue (DLQ) for manual intervention.
    }
  }

  // NOTE: Additional event handlers could be added here to trigger other workflows.
  // For example, an event from the Plaid Integration Service indicating new raw transactions
  // are available could trigger a `TransactionIngestionWorkflow`.
  // @EventPattern('plaid.transactions.available')
  // async handleTransactionsAvailable(@Payload() payload: any): Promise<void> { ... }
}
