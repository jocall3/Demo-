import { Injectable, Logger, Inject } from '@nestjs/common';
import { Client as TemporalClient } from '@temporalio/client';
import { v4 as uuidv4 } from 'uuid';

import { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import {
  InitiatePaymentCommand,
  UpdateTransactionStatusCommand,
} from '../commands/transaction.commands';
import { ITransactionCommandService } from '../ports/transaction-command-service.interface';
import { paymentWorkflow } from '../../infrastructure/temporal/workflows';
import { TEMPORAL_CLIENT_TOKEN } from '../../infrastructure/temporal/temporal.constants';
import { TRANSACTION_REPOSITORY_TOKEN } from '../../domain/domain.constants';

/**
 * @class TransactionCommandService
 * @implements {ITransactionCommandService}
 * @description This service is the primary implementation of the command-side of the CQRS pattern for the Transaction domain,
 *              adhering to Hexagonal Architecture. It acts as an application service that orchestrates command execution.
 *              For complex, multi-step business processes like payments, it initiates durable workflows using a workflow
 *              orchestration engine (Temporal). For simpler state changes, it uses an event-sourcing approach by loading
 *              an aggregate, executing a command, and persisting the resulting domain events.
 * @see ITransactionCommandService
 * @see ITransactionRepository
 * @see paymentWorkflow
 */
@Injectable()
export class TransactionCommandService implements ITransactionCommandService {
  private readonly logger = new Logger(TransactionCommandService.name);

  /**
   * @constructor
   * @param {TemporalClient} temporalClient - An injected client for interacting with the Temporal cluster. This is an adapter to an external infrastructure.
   * @param {ITransactionRepository} transactionRepository - An injected repository (port) for interacting with the transaction aggregate's event store.
   */
  constructor(
    @Inject(TEMPORAL_CLIENT_TOKEN)
    private readonly temporalClient: TemporalClient,
    @Inject(TRANSACTION_REPOSITORY_TOKEN)
    private readonly transactionRepository: ITransactionRepository,
  ) {}

  /**
   * @method initiatePayment
   * @description Handles the `InitiatePaymentCommand`. Its primary responsibility is to start the durable `paymentWorkflow`
   *              using the injected Temporal client. This offloads the complex, stateful payment saga logic from the service
   *              to a reliable, observable, and scalable orchestration engine.
   * @param {InitiatePaymentCommand} command - The command object containing the details of the payment to be initiated.
   * @returns {Promise<string>} A promise that resolves with the unique ID of the started workflow, which can be used for tracking.
   */
  async initiatePayment(command: InitiatePaymentCommand): Promise<string> {
    const workflowId = `payment-${uuidv4()}`;
    this.logger.log(
      `Initiating payment workflow with ID: ${workflowId} for user ${command.userId}`,
    );

    // The workflow will be responsible for creating the initial transaction record (event sourced)
    // and orchestrating the saga of debiting, crediting, and handling failures.
    await this.temporalClient.workflow.start(paymentWorkflow, {
      taskQueue: 'transactions-task-queue', // Should match the task queue a worker is listening on
      workflowId: workflowId,
      args: [command], // Pass the entire command DTO to the workflow
    });

    this.logger.log(`Successfully started payment workflow: ${workflowId}`);
    return workflowId;
  }

  /**
   * @method updateTransactionStatus
   * @description Handles a command to update the status of a transaction. This method demonstrates a classic
   *              event-sourcing flow: load an aggregate, execute a method that creates events, and save the events.
   *              This is suitable for simpler state transitions that don't require a multi-step saga.
   * @param {UpdateTransactionStatusCommand} command - The command containing the transaction ID and new status.
   * @returns {Promise<void>} A promise that resolves when the state change has been successfully persisted to the event store.
   * @throws {Error} If the transaction aggregate cannot be found.
   */
  async updateTransactionStatus(
    command: UpdateTransactionStatusCommand,
  ): Promise<void> {
    const { transactionId, status, failureReason } = command;
    this.logger.log(
      `Handling UpdateTransactionStatusCommand for transaction ${transactionId} to status ${status}`,
    );

    // 1. Load the aggregate from its history of events via the repository port.
    const transactionAggregate = await this.transactionRepository.findById(
      transactionId,
    );
    if (!transactionAggregate) {
      throw new Error(`Transaction with ID ${transactionId} not found.`);
    }

    // 2. Execute the command on the domain aggregate.
    // This is a synchronous operation that produces domain events but does not perform I/O.
    if (status === 'FAILED') {
      transactionAggregate.fail(failureReason);
    } else {
      transactionAggregate.updateStatus(status);
    }

    // 3. Persist the new, uncommitted events to the event store via the repository port.
    await this.transactionRepository.save(transactionAggregate);

    this.logger.log(
      `Successfully persisted status update for transaction ${transactionId}`,
    );
  }
}
