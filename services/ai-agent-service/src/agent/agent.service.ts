import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  InlineDataPart,
} from '@google/generative-ai';
// --- New imports for Workflow Orchestration ---
import { WorkflowClient } from '@temporalio/client'; // Assuming usage of Temporal
import { businessPlanAnalysisWorkflow } from '../workflows/business-plan-analysis.workflow'; // This is a conceptual import, as the workflow would be defined in its own file.
import { v4 as uuidv4 } from 'uuid';

// --- Input/Output DTOs for the service layer ---

export interface GenerateTextInput {
  prompt: string;
}

export interface ChatInput {
  history: Content[];
  newMessage: string;
}

export interface EditImageInput {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

export interface GenerateVideoInput {
  prompt: string;
  settings: Record<string, any>;
}

export interface VideoGenerationResult {
  operationId: string;
  status: 'processing' | 'completed' | 'failed';
  videoUri?: string;
}

// --- Event Payload Interfaces ---

export interface RunBusinessPlanAnalysisEvent {
  userId: string;
  businessPlan: string;
}

export interface TriggerFinancialAnalysisEvent {
  userId: string;
}

export interface CardStoryRequestEvent {
  userId: string;
  prompt: string;
}

/**
 * @Injectable()
 * `AgentService` is the core of the AI Agent microservice. It encapsulates all business logic
 * for interacting with the underlying generative AI provider (Google Gemini) and orchestrates
 * complex, multi-step AI workflows triggered by events from the message bus.
 */
@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;
  private gatewayUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly httpService: HttpService,
    // Inject the workflow client. This assumes it's provided in a module (e.g., TemporalModule).
    @Inject('TEMPORAL_WORKFLOW_CLIENT')
    private readonly workflowClient: WorkflowClient,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY');
    if (!apiKey) {
      const errorMessage =
        'GOOGLE_GEMINI_API_KEY is not configured. The AI Agent Service will not function.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.gatewayUrl = this.configService.get<string>('API_GATEWAY_URL');
    if (!this.gatewayUrl) {
      this.logger.warn('API_GATEWAY_URL is not configured. Proactive analysis will be disabled.');
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.textModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
      this.logger.log('AI Agent Service initialized successfully with Google Gemini models.');
    } catch (error) {
      this.logger.error('Failed to initialize Google Generative AI client.', error.stack);
      throw error;
    }
  }

  // --- GraphQL-facing Methods ---

  async generateText(input: GenerateTextInput): Promise<string> {
    const { prompt } = input;
    try {
      this.logger.log(`Generating text for prompt: "${prompt.substring(0, 60)}..."`);
      const result = await this.textModel.generateContent(prompt);
      const text = result.response.text();
      this.logger.log('Successfully generated text response.');
      return text;
    } catch (error) {
      this.logger.error(`Error in generateText for prompt: "${prompt.substring(0, 60)}..."`, error.stack);
      throw new Error('Failed to generate text from AI service.');
    }
  }

  async continueChat(input: ChatInput): Promise<Part[]> {
    const { history, newMessage } = input;
    try {
      this.logger.log(`Continuing chat. History length: ${history.length}. New message: "${newMessage.substring(0, 60)}..."`);
      const chat = this.textModel.startChat({ history });
      const result = await chat.sendMessage(newMessage);
      this.logger.log('Successfully received chat response from AI model.');
      return result.response.parts;
    } catch (error) {
      this.logger.error('Error during chat conversation.', error.stack);
      throw new Error('Failed to get chat response from AI service.');
    }
  }

  async editImage(input: EditImageInput): Promise<{ imageBase64: string; mimeType: string }> {
    const { prompt, imageBase64, mimeType } = input;
    const imagePart: InlineDataPart = { inlineData: { data: imageBase64, mimeType } };
    
    this.logger.log(`Editing image with prompt: "${prompt.substring(0, 60)}..."`);
    try {
      await this.visionModel.generateContent([prompt, imagePart]);
      this.logger.log('Image edit simulation successful (NOTE: gemini-pro-vision does not actually edit images).');
      return { imageBase64, mimeType }; // Returning original for simulation
    } catch (error) {
      this.logger.error('Error editing image.', error.stack);
      throw new Error('Failed to edit image with AI service.');
    }
  }

  async generateVideo(input: GenerateVideoInput): Promise<{ videoUri: string; operationId: string }> {
    const { prompt } = input;
    const operationId = `video-op-${Date.now()}`;
    this.logger.log(`Starting video generation for prompt: "${prompt.substring(0, 60)}..."`);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.logger.log(`[${operationId}] Polling for status...`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      this.logger.log(`[${operationId}] Video generation completed.`);
      const videoUri = 'https://storage.googleapis.com/demobank-mock-assets/ai-ads/mock-video.mp4';
      return { videoUri, operationId };
    } catch (error) {
      this.logger.error(`[${operationId}] Error during video generation`, error.stack);
      throw new Error(`Failed to generate video. Operation ID: ${operationId}.`);
    }
  }

  async getVideoGenerationStatus(operationId: string): Promise<VideoGenerationResult> {
    this.logger.log(`Checking status for video operation ${operationId}. Simulating completion.`);
    return {
        operationId,
        status: 'completed',
        videoUri: 'https://storage.googleapis.com/demobank-mock-assets/ai-ads/mock-video.mp4'
    };
  }

  // --- Event-driven Workflow Methods ---

  /**
   * REFACTORED: This method now triggers a durable, stateful workflow instead of executing the logic directly.
   * It receives the event and starts a new workflow execution with the payload.
   * The workflow engine is now responsible for the orchestration, retries, and state management.
   */
  async runBusinessPlanAnalysis(payload: RunBusinessPlanAnalysisEvent): Promise<void> {
    const { userId, businessPlan } = payload;
    const workflowId = `business-plan-${userId}-${uuidv4()}`;
    this.logger.log(`Triggering 'businessPlanAnalysis' workflow with ID: ${workflowId}`);
    
    try {
      await this.workflowClient.start(businessPlanAnalysisWorkflow, {
        args: [{ userId, businessPlan }],
        taskQueue: 'ai-agent-tasks',
        workflowId: workflowId,
      });
      this.logger.log(`Workflow ${workflowId} for user ${payload.userId} started successfully.`);
    } catch (error) {
      this.logger.error(`Failed to start business plan analysis workflow for user ${payload.userId}`, error.stack);
      this.kafkaClient.emit('agent.workflow.start_failed', {
        workflowName: 'businessPlanAnalysisWorkflow',
        workflowId,
        userId,
        error: error.message,
      });
    }
  }

  // --- Activity Implementations ---
  // The following methods implement the business logic for the activities that are orchestrated by the workflow.
  // A Temporal Worker process within this service would be configured to listen on the 'ai-agent-tasks' task queue
  // and execute these methods when a workflow calls for them.

  /**
   * @ActivityImplementation Generates feedback for a business plan.
   */
  async generateFeedback(businessPlan: string): Promise<string> {
    this.logger.log(`[Activity: generateFeedback] Executing...`);
    const prompt = `Provide concise, high-level feedback on the following business plan: "${businessPlan}"`;
    return this.generateText({ prompt });
  }

  /**
   * @ActivityImplementation Generates and parses critical questions for a business plan.
   */
  async generateAndParseQuestions(businessPlan: string): Promise<any[]> {
    this.logger.log('[Activity: generateAndParseQuestions] Executing...');
    const prompt = `Based on the plan, generate 3 critical questions a VC might ask. Categorize each into 'Market', 'Finance', or 'Operations'. Format as a valid JSON array of objects with "question" and "category" keys. Plan: "${businessPlan}"`;
    const questionsText = await this.generateText({ prompt });
    const questions = JSON.parse(questionsText.replace(/```json|```/g, '').trim());
    return questions;
  }

  /**
   * @ActivityImplementation Emits a completion event to Kafka.
   */
  async notifyAnalysisCompleted(payload: { userId: string, feedback: string, questions: any[] }): Promise<void> {
    this.logger.log(`[Activity: notifyAnalysisCompleted] Notifying of completion for user ${payload.userId}`);
    this.kafkaClient.emit('agent.business_plan_analysis.completed', { ...payload, status: 'success' });
  }
  
  /**
   * @ActivityImplementation Emits a failure event to Kafka. This would be part of a compensation/Saga pattern in the workflow.
   */
  async notifyAnalysisFailed(payload: { userId: string, error: string }): Promise<void> {
    this.logger.log(`[Activity: notifyAnalysisFailed] Notifying of failure for user ${payload.userId}`);
    this.kafkaClient.emit('agent.business_plan_analysis.failed', payload);
  }

  async runProactiveFinancialAnalysis(payload: TriggerFinancialAnalysisEvent): Promise<void> {
    const { userId } = payload;
    this.logger.log(`Starting proactive financial analysis for user ${userId}`);

    if (!this.gatewayUrl) {
      this.logger.error('Cannot run proactive analysis: API_GATEWAY_URL is not configured.');
      return;
    }

    try {
      const query = `query GetUserTransactions($id: ID!) { user(id: $id) { transactions(filter: { limit: 50 }) { description amount category date } } }`;
      const response = await firstValueFrom(
        this.httpService.post(this.gatewayUrl, { query, variables: { id: userId } })
      );
      const transactions = response.data.data.user.transactions;
      const transactionsSummary = JSON.stringify(transactions);

      const prompt = `Analyze these recent financial transactions and provide one critical insight or savings opportunity. Be concise. Transactions: ${transactionsSummary}`;
      const insight = await this.generateText({ prompt });

      this.kafkaClient.emit('ai.insight.generated', {
          userId,
          insight,
          type: 'proactive_financial_analysis',
          timestamp: new Date().toISOString()
      });
      this.logger.log(`Generated proactive financial insight for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error during proactive financial analysis for user ${userId}`, error.stack);
      this.kafkaClient.emit('ai.insight.generation.failed', { userId, type: 'proactive_financial_analysis', error: error.message });
    }
  }

  async runCardStoryGeneration(payload: CardStoryRequestEvent): Promise<void> {
    const { userId, prompt } = payload;
    this.logger.log(`Starting card story generation for user ${userId}`);
    try {
        const story = await this.generateText({ prompt });
        this.kafkaClient.emit('ai.card.story.generated', { userId, prompt, story, status: 'success' });
        this.logger.log(`Successfully generated card story for user ${userId}`);
    } catch (error) {
        this.logger.error(`Error during card story generation for user ${userId}`, error.stack);
        this.kafkaClient.emit('ai.card.story.generation.failed', { userId, prompt, error: error.message });
    }
  }
}
