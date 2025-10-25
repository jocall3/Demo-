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
import { Client as TemporalClient } from '@temporalio/client';
import { WorkflowExecutionDescription } from '@temporalio/client';
import { InitiatePaymentDto } from '../../application/dtos/initiate-payment.dto';
import { TransactionCommandService } from '../../application/services/transaction-command.service';
import { TEMPORAL_CLIENT_TOKEN } from '../temporal/temporal.constants';

/**
 * @class TransactionController
 * @description This controller is an **inbound adapter** in a Hexagonal Architecture.
 * Its primary role is to translate incoming HTTP requests into commands for the application's core logic.
 * Following the "Durable Saga Pattern" directive, it does not contain complex business logic;
 * instead, it initiates and queries long-running, durable workflows managed by a workflow
 * orchestration engine (Temporal) via the application service.
 *
 * This controller provides a synchronous REST API for initiating payment sagas, which might be used
 * by internal tools or for specific integration scenarios that do not use the GraphQL supergraph.
 *
 * @see TransactionCommandService - The application service port for command-side operations.
 * @see paymentWorkflow - The durable workflow that orchestrates the payment saga.
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
   * @param {TransactionCommandService} transactionCommandService - The application service handling the command logic.
   * @param {Client} temporalClient - The injected Temporal client, used to query workflows.
   */
  constructor(
    private readonly transactionCommandService: TransactionCommandService,
    @Inject(TEMPORAL_CLIENT_TOKEN) private readonly temporalClient: TemporalClient,
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
    this.logger.log(
      `Received REST request to initiate payment for user ${paymentDto.userId}.`,
    );

    // Delegate the command to the application service. The service is responsible
    // for orchestrating the workflow start.
    const workflowId = await this.transactionCommandService.initiatePayment(
      paymentDto,
    );

    return { workflowId };
  }

  /**
   * @method getWorkflowStatus
   * @description Retrieves the current status and execution history of a specific payment workflow.
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

    // Querying workflow status is a direct interaction with the orchestration engine's infrastructure,
    // so using the Temporal client directly here is appropriate.
    const handle = this.temporalClient.workflow.getHandle(workflowId);
    const description = await handle.describe();

    this.logger.log(
      `Found workflow ${workflowId} with status: ${description.status.name}`,
    );

    return description;
  }
}
