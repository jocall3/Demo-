/**
 * @file services/ai-agent-service/src/infrastructure/controllers/agent.controller.ts
 * @description Inbound adapter for the AI Agent service, handling asynchronous events from the message bus.
 */

import { Controller, Logger, ValidationPipe, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { IsNotEmpty, IsString } from 'class-validator';
import { Client } from '@temporalio/client';

// As per Hexagonal Architecture, this controller is an adapter that depends on a port.
// Here, the port is the Temporal client for starting workflows.
import { TEMPORAL_CLIENT } from '../../temporal/temporal.module';

// Workflows are part of the application's core logic.
// An index file in the workflows directory is assumed to export all workflow functions.
import {
  businessPlanAnalysisWorkflow,
  proactiveFinancialAnalysisWorkflow,
  cardStoryGenerationWorkflow,
} from '../../temporal/workflows';

// --- DTOs for incoming events. --- 
// In a larger application, these would be in a dedicated DTOs folder (e.g., in the application layer).

/**
 * @class RunBusinessPlanAnalysisEvent
 * @description Data Transfer Object for the `agent.run.business_plan_analysis` event payload.
 */
class RunBusinessPlanAnalysisEvent {
  /**
   * The unique identifier of the user who submitted the business plan.
   * @type {string}
   * @IsString()
   * @IsNotEmpty()
   */
  @IsString()
  @IsNotEmpty()
  userId: string;

  /**
   * The full text of the business plan to be analyzed.
   * @type {string}
   * @IsString()
   * @IsNotEmpty()
   */
  @IsString()
  @IsNotEmpty()
  businessPlan: string;
}

/**
 * @class TriggerFinancialAnalysisEvent
 * @description Data Transfer Object for the `user.financial_data.updated` event payload.
 */
class TriggerFinancialAnalysisEvent {
  /**
   * The unique identifier of the user whose data should be analyzed.
   * @type {string}
   * @IsString()
   * @IsNotEmpty()
   */
  @IsString()
  @IsNotEmpty()
  userId: string;
}

/**
 * @class CardStoryRequestEvent
 * @description Data Transfer Object for the `ai.card.story.requested` event payload.
 */
class CardStoryRequestEvent {
  /**
   * The unique identifier of the user requesting the card story.
   * @type {string}
   * @IsString()
   * @IsNotEmpty()
   */
  @IsString()
  @IsNotEmpty()
  userId: string;

  /**
   * The prompt describing the card design for which a story should be generated.
   * @type {string}
   * @IsString()
   * @IsNotEmpty()
   */
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

/**
 * @class AgentController
 * @description This controller is an inbound adapter in a Hexagonal Architecture. It subscribes to
 * events on the message bus (Kafka) and acts as the entry point for triggering long-running,
 * durable business processes (Sagas) orchestrated by Temporal.
 *
 * ARCHITECTURAL REFACTOR:
 * This controller's sole responsibility is to receive events, validate their payloads, and start
 * the corresponding Temporal workflow. This decouples the event transport layer from the core business
 * logic, which is now encapsulated within Temporal Workflows and Activities. This aligns with the
 * "Durable Saga Pattern" and "Hexagonal Architecture" directives.
 */
@Controller()
export class AgentController {
  /**
   * @private
   * @readonly
   * @type {Logger}
   * @memberof AgentController
   */
  private readonly logger = new Logger(AgentController.name);

  /**
   * Creates an instance of AgentController.
   * @param {Client} temporalClient - The injected Temporal client, used to start workflows.
   * @memberof AgentController
   */
  constructor(
    @Inject(TEMPORAL_CLIENT) private readonly temporalClient: Client,
  ) {}

  /**
   * @method handleBusinessPlanAnalysis
   * @description Subscribes to the 'agent.run.business_plan_analysis' event. When this event is received,
   * it initiates the durable `businessPlanAnalysisWorkflow` to process the business plan.
   *
   * @param {RunBusinessPlanAnalysisEvent} payload - The validated event payload containing the user ID and business plan.
   * @returns {Promise<void>}
   * @memberof AgentController
   */
  @EventPattern('agent.run.business_plan_analysis')
  async handleBusinessPlanAnalysis(
    @Payload(new ValidationPipe()) payload: RunBusinessPlanAnalysisEvent,
  ): Promise<void> {
    this.logger.log(
      `Received event 'agent.run.business_plan_analysis' for user: ${payload.userId}. Starting workflow.`,
    );

    try {
      const workflowId = `biz-plan-${payload.userId}-${Date.now()}`;
      const handle = await this.temporalClient.workflow.start(
        businessPlanAnalysisWorkflow,
        {
          taskQueue: 'ai-agent-tasks', // The task queue the Temporal workers are listening on
          workflowId: workflowId,
          args: [payload], // Arguments are passed directly to the workflow function
        },
      );
      this.logger.log(
        `Started business plan analysis workflow with ID: ${handle.workflowId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start 'businessPlanAnalysisWorkflow' for user: ${payload.userId}`,
        error.stack,
      );
      // In a production system, this failure might be published to a dead-letter queue or trigger an alert.
    }
  }

  /**
   * @method handleFinancialDataUpdate
   * @description Subscribes to the 'user.financial_data.updated' event. This triggers a proactive,
   * autonomous financial analysis for the user, managed as a durable workflow.
   *
   * @param {TriggerFinancialAnalysisEvent} payload - The validated event payload containing the user ID.
   * @returns {Promise<void>}
   * @memberof AgentController
   */
  @EventPattern('user.financial_data.updated')
  async handleFinancialDataUpdate(
    @Payload(new ValidationPipe()) payload: TriggerFinancialAnalysisEvent,
  ): Promise<void> {
    this.logger.log(
      `Received event 'user.financial_data.updated' for user: ${payload.userId}. Starting proactive analysis workflow.`,
    );

    try {
      const workflowId = `proactive-analysis-${payload.userId}`;
      await this.temporalClient.workflow.start(
        proactiveFinancialAnalysisWorkflow,
        {
          taskQueue: 'ai-agent-tasks',
          workflowId: workflowId,
          workflowIdReusePolicy: 'AllowDuplicate',
          args: [payload],
        },
      );
      this.logger.log(
        `Started proactive financial analysis workflow with ID: ${workflowId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start 'proactiveFinancialAnalysisWorkflow' for user: ${payload.userId}`,
        error.stack,
      );
    }
  }

  /**
   * @method handleCardStoryRequest
   * @description Subscribes to the 'ai.card.story.requested' event. This triggers a workflow to
   * generate a narrative for a user's custom card design.
   *
   * @param {CardStoryRequestEvent} payload - The validated event payload with details for story generation.
   * @returns {Promise<void>}
   * @memberof AgentController
   */
  @EventPattern('ai.card.story.requested')
  async handleCardStoryRequest(
    @Payload(new ValidationPipe()) payload: CardStoryRequestEvent,
  ): Promise<void> {
    this.logger.log(
      `Received event 'ai.card.story.requested' for user: ${payload.userId}. Starting workflow.`,
    );

    try {
      const workflowId = `card-story-${payload.userId}-${Date.now()}`;
      const handle = await this.temporalClient.workflow.start(
        cardStoryGenerationWorkflow,
        {
          taskQueue: 'ai-agent-tasks',
          workflowId: workflowId,
          args: [payload],
        },
      );
      this.logger.log(
        `Started card story generation workflow with ID: ${handle.workflowId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start 'cardStoryGenerationWorkflow' for user: ${payload.userId}`,
        error.stack,
      );
    }
  }
}
