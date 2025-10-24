import { Controller, Logger, ValidationPipe } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AgentService } from './agent.service';
import {
  RunBusinessPlanAnalysisEvent,
  TriggerFinancialAnalysisEvent,
} from './events/agent.events';

/**
 * @class AgentController
 * @description This controller acts as the event-driven entry point for the AI Agent Service.
 * It subscribes to topics on the central message bus (e.g., Kafka) and triggers
 * the appropriate long-running agentic workflows within the AgentService.
 *
 * This adheres to the event-driven, choreography-based communication pattern of the
 * new microservices architecture. It does not expose any synchronous endpoints like REST or GraphQL.
 */
@Controller()
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  /**
   * Listens for the 'agent.run.business_plan_analysis' event.
   * This event is likely published by the API Gateway when a user submits a business plan
   * through a feature like the 'Quantum Weaver'.
   *
   * Upon receiving the event, it delegates the complex, multi-step analysis process
   * to the AgentService.
   *
   * @param {RunBusinessPlanAnalysisEvent} payload - The event payload containing the user ID and business plan.
   */
  @EventPattern('agent.run.business_plan_analysis')
  async handleBusinessPlanAnalysis(
    @Payload(new ValidationPipe()) payload: RunBusinessPlanAnalysisEvent,
  ) {
    this.logger.log(
      `Received event 'agent.run.business_plan_analysis' for user: ${payload.userId}`,
    );
    // The service method is intentionally not awaited, as this is a fire-and-forget
    // event pattern. The service is responsible for managing the async workflow.
    this.agentService.runBusinessPlanAnalysis(payload);
  }

  /**
   * Listens for events indicating that a user's financial data has been updated,
   * such as a new bank account being linked or a large batch of transactions being synced.
   * This triggers a proactive, autonomous analysis by a financial agent.
   *
   * @param {TriggerFinancialAnalysisEvent} payload - The event payload, typically just the user ID.
   */
  @EventPattern('user.financial_data.updated')
  async handleFinancialDataUpdate(
    @Payload(new ValidationPipe()) payload: TriggerFinancialAnalysisEvent,
  ) {
    this.logger.log(
      `Received event 'user.financial_data.updated' for user: ${payload.userId}. Triggering proactive analysis.`,
    );
    this.agentService.runProactiveFinancialAnalysis(payload);
  }

  /**
   * Listens for an event indicating a user has requested a custom card design.
   * This triggers an AI agent to generate a narrative or 'story' for the card.
   * @param payload - The event payload containing details for the story generation.
   */
  @EventPattern('ai.card.story.requested')
  async handleCardStoryRequest(
    @Payload(new ValidationPipe()) payload: { userId: string; prompt: string },
  ) {
    this.logger.log(
      `Received event 'ai.card.story.requested' for user: ${payload.userId}`,
    );
    this.agentService.runCardStoryGeneration(payload);
  }
}
