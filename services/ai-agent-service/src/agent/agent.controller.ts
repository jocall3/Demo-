import { Controller, Logger, ValidationPipe, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AgentService } from './agent.service';
import {
  RunBusinessPlanAnalysisEvent,
  TriggerFinancialAnalysisEvent,
  CardStoryRequestEvent
} from './events/agent.events';
import { Client } from '@temporalio/client';
import { TEMPORAL_CLIENT } from '../temporal/temporal.constants';
import {
  businessPlanAnalysisWorkflow,
  proactiveFinancialAnalysisWorkflow,
  cardStoryGenerationWorkflow,
} from '../temporal/workflows';

/**
 * @class AgentController
 * @description This controller acts as the event-driven entry point for the AI Agent Service.
 * It subscribes to topics on the central message bus (e.g., Kafka) and triggers
 * the appropriate long-running, durable workflows using a workflow orchestration engine.
 *
 * ARCHITECTURAL REFACTOR:
 * This controller has been refactored to integrate with a workflow orchestration engine (e.g., Temporal).
 * Instead of invoking service methods that manage complex state and retries (a "choreography" pattern),
 * it now starts durable, stateful "workflows" ("orchestration" pattern). This provides better visibility,
 * reliability, and scalability for long-running asynchronous processes like the Quantum Weaver analysis.
 * The `AgentService` is no longer directly used by the controller for event handling, as its methods
 * now primarily serve as Temporal Activities.
 */
@Controller()
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(
    @Inject(TEMPORAL_CLIENT) private readonly temporalClient: Client,
  ) {}

  /**
   * Listens for the 'agent.run.business_plan_analysis' event (e.g., from the Quantum Weaver feature).
   * This event triggers the start of a durable workflow to analyze the business plan.
   *
   * @param {RunBusinessPlanAnalysisEvent} payload - The event payload containing the user ID and business plan.
   */
  @EventPattern('agent.run.business_plan_analysis')
  async handleBusinessPlanAnalysis(
    @Payload(new ValidationPipe()) payload: RunBusinessPlanAnalysisEvent,
  ) {
    this.logger.log(
      `Received event 'agent.run.business_plan_analysis' for user: ${payload.userId}. Starting workflow.`,
    );

    try {
      const workflowId = `biz-plan-${payload.userId}-${Date.now()}`;
      const handle = await this.temporalClient.workflow.start(
        businessPlanAnalysisWorkflow,
        {
          taskQueue: 'ai-agent-tasks', // The task queue workers are listening on
          workflowId: workflowId,
          args: [payload], // Arguments passed to the workflow function
        },
      );
      this.logger.log(
        `Started business plan analysis workflow with ID: ${handle.workflowId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start business plan analysis workflow for user: ${payload.userId}`,
        error.stack,
      );
      // In production, we might emit a failure event back to the bus or handle it via a dead-letter queue.
    }
  }

  /**
   * Listens for 'user.financial_data.updated' to trigger a proactive, autonomous analysis.
   * This is now managed as a durable workflow.
   *
   * @param {TriggerFinancialAnalysisEvent} payload - The event payload, typically just the user ID.
   */
  @EventPattern('user.financial_data.updated')
  async handleFinancialDataUpdate(
    @Payload(new ValidationPipe()) payload: TriggerFinancialAnalysisEvent,
  ) {
    this.logger.log(
      `Received event 'user.financial_data.updated' for user: ${payload.userId}. Starting proactive analysis workflow.`,
    );

    try {
      const workflowId = `proactive-analysis-${payload.userId}`;
      const handle = await this.temporalClient.workflow.start(
        proactiveFinancialAnalysisWorkflow,
        {
          taskQueue: 'ai-agent-tasks',
          // Allows starting the workflow only if one with the same ID is not already running.
          workflowId: workflowId,
          workflowIdReusePolicy: 'AllowDuplicate',
          args: [payload],
        },
      );
      this.logger.log(
        `Started proactive financial analysis workflow with ID: ${handle.workflowId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start proactive financial analysis workflow for user: ${payload.userId}`,
        error.stack,
      );
    }
  }

  /**
   * Listens for 'ai.card.story.requested' to generate a narrative for a custom card design.
   * This process is also now managed as a workflow.
   *
   * @param {CardStoryRequestEvent} payload - The event payload containing details for the story generation.
   */
  @EventPattern('ai.card.story.requested')
  async handleCardStoryRequest(
    @Payload(new ValidationPipe()) payload: CardStoryRequestEvent,
  ) {
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
        `Failed to start card story generation workflow for user: ${payload.userId}`,
        error.stack,
      );
    }
  }
}
