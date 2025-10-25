import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { Client } from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';
import { InitiatePaymentDto } from '../../application/dtos/initiate-payment.dto';
import { paymentWorkflow } from '../../application/workflows/payment.workflow';
import { TEMPORAL_CLIENT } from '../temporal/temporal.constants';
import { WorkflowExecutionDescription } from '@temporalio/client';

/**
 * @class TransactionController
 * @description This controller is an **Input Adapter** in the Hexagonal Architecture.
 * Its primary role is to translate incoming HTTP requests into commands for the application's core logic.
 * Following the "Durable Saga Pattern" directive, it does not contain business logic itself;
 * instead, it initiates and queries long-running, durable workflows managed by a workflow
 * orchestration engine (Temporal).
 */
@Controller('transactions')
export class TransactionController {
  /**
   * @private
   * @readonly
   * @type {Logger}
   * @memberof TransactionController
   * @description A private, read-only instance of the NestJS Logger, scoped to this controller.
   */
  private readonly logger = new Logger(TransactionController.name);

  /**
   * Creates an instance of TransactionController.
   * @param {Client} temporalClient - The injected Temporal client, used to start and query workflows.
   * This client acts as the "port" to the application's core logic.
   */
  constructor(
    @Inject(TEMPORAL_CLIENT) private readonly temporalClient: Client,
  ) {}

  /**
   * @method initiatePayment
   * @description Starts a new payment processing saga by initiating a durable workflow.
   * This endpoint is asynchronous from the client's perspective; it immediately returns a workflow ID
   * for tracking, while the actual multi-step payment process runs in the background.
   *
   * @param {InitiatePaymentDto} paymentDto - The data transfer object containing the payment details.
   * @returns {Promise<{ workflowId: string }>} A promise that resolves to an object containing the unique ID of the started workflow.
   */
  @Post('initiate')
  async initiatePayment(
    @Body(new ValidationPipe()) paymentDto: InitiatePaymentDto,
  ): Promise<{ workflowId: string }> {
    const workflowId = `payment-${uuidv4()}`;
    this.logger.log(
      `Received request to initiate payment. Starting workflow with ID: ${workflowId}`,
    );

    await this.temporalClient.workflow.start(paymentWorkflow, {
      taskQueue: 'transactions-queue',
      workflowId: workflowId,
      args: [paymentDto], // Pass the validated DTO directly to the workflow
    });

    this.logger.log(`Workflow ${workflowId} started successfully.`);

    return { workflowId };
  }

  /**
   * @method getWorkflowStatus
   * @description Retrieves the current status and execution history of a specific workflow.
   * This allows clients to poll for the outcome of an initiated payment saga.
   *
   * @param {string} workflowId - The unique ID of the workflow to query.
   * @returns {Promise<WorkflowExecutionDescription>} A promise that resolves to an object describing the workflow's state.
   */
  @Get('status/:workflowId')
  async getWorkflowStatus(
    @Param('workflowId') workflowId: string,
  ): Promise<WorkflowExecutionDescription> {
    this.logger.log(`Querying status for workflow ID: ${workflowId}`);

    const handle = this.temporalClient.workflow.getHandle(workflowId);
    const description = await handle.describe();

    this.logger.log(
      `Found workflow ${workflowId} with status: ${description.status.name}`,
    );

    return description;
  }
}
