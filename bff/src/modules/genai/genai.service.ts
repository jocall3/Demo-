import { Injectable, OnModuleInit, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Connection, WorkflowFailedError } from '@temporalio/client';
import { randomUUID } from 'node:crypto';

// DTOs for inputs to align with GraphQL and workflow definitions
export interface BusinessPlanAnalysisInput {
  userId: string;
  businessPlan: string;
}

export interface VideoGenerationInput {
  userId: string;
  prompt: string;
  settings: Record<string, any>;
}

export interface GenerateCardImageInput {
  imageBase64: string;
  mimeType: string;
  prompt: string;
}

export interface AskAIAdvisorInput {
  history: any[]; // Using 'any' as Content type is not defined here
  message: string;
}

/**
 * @Injectable
 * GenaiService is the new interface for initiating complex, long-running AI tasks.
 *
 * ARCHITECTURAL REFACTOR:
 * This service no longer contains direct calls to the Google Gemini API for asynchronous processes.
 * Instead, it acts as a client to a Temporal workflow orchestration engine. It is responsible for:
 * 1. Connecting to the Temporal cluster.
 * 2. Starting long-running workflows like 'Quantum Weaver' business plan analysis and video generation.
 * 3. Awaiting and returning the results of these durable executions.
 *
 * This change decouples the BFF from the complexities of the AI workflow, offloading state management,
 * retries, and failures to the Temporal engine. Synchronous, fast AI calls (like simple text generation)
 * might still be handled here directly if needed, but the primary focus is orchestration.
 */
@Injectable()
export class GenaiService implements OnModuleInit {
  private readonly logger = new Logger(GenaiService.name);
  private temporalClient: Client | null = null;

  constructor(private configService: ConfigService) {}

  /**
   * Establishes a connection to the Temporal frontend service on module initialization.
   */
  async onModuleInit() {
    try {
      const temporalAddress = this.configService.get<string>('TEMPORAL_ADDRESS');
      if (!temporalAddress) {
        this.logger.warn('TEMPORAL_ADDRESS is not configured. GenAI workflow features will be unavailable.');
        return;
      }
      const connection = await Connection.connect({ address: temporalAddress });
      this.temporalClient = new Client({ connection });
      this.logger.log(`Successfully connected to Temporal frontend at ${temporalAddress}`);
    } catch (err) {
      this.logger.error('Failed to connect to Temporal.', err);
      // The service will continue to run, but workflow-related methods will fail.
    }
  }

  private ensureClient(): Client {
    if (!this.temporalClient) {
      this.logger.error('Temporal client is not connected. Cannot start workflow.');
      throw new HttpException(
        'AI orchestration engine is currently unavailable.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.temporalClient;
  }

  /**
   * Starts the 'Quantum Weaver' business plan analysis workflow.
   * This is a "fire-and-forget" start. The client gets a workflow ID and can
   * use it to query the status later if needed. The workflow itself will communicate
   * its results back via events or other means.
   *
   * @param input The business plan and user ID.
   * @returns The unique ID for the started workflow instance.
   */
  async startBusinessPlanAnalysis(input: BusinessPlanAnalysisInput): Promise<string> {
    const client = this.ensureClient();
    const workflowId = `q-weaver-${input.userId}-${randomUUID()}`;
    this.logger.log(`Starting 'quantumWeaverWorkflow' with ID: ${workflowId}`);

    try {
      await client.workflow.start('quantumWeaverWorkflow', {
        taskQueue: 'genai-task-queue',
        workflowId: workflowId,
        args: [input],
        // You can define timeouts and retry policies here
        // workflowExecutionTimeout: '5 minutes',
      });
      return workflowId;
    } catch (error) {
      this.logger.error(`Failed to start quantumWeaverWorkflow: ${workflowId}`, error);
      throw new HttpException('Failed to start business plan analysis.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Starts a video generation workflow and waits for its completion.
   * This uses `workflow.execute` which is a convenience method for starting a workflow
   * and awaiting its result. Ideal for requests where the client waits for the final artifact.
   *
   * @param input The prompt and settings for the video.
   * @returns The final result of the workflow, likely containing a URL to the generated video.
   */
  async generateAdVideo(input: VideoGenerationInput): Promise<{ videoUrl: string }> {
    const client = this.ensureClient();
    const workflowId = `video-gen-${input.userId}-${randomUUID()}`;
    this.logger.log(`Executing 'videoGenerationWorkflow' with ID: ${workflowId}`);

    try {
      // `execute` starts the workflow and returns a promise that resolves with the result.
      const result = await client.workflow.execute('videoGenerationWorkflow', {
        taskQueue: 'genai-task-queue',
        workflowId: workflowId,
        args: [input],
        workflowExecutionTimeout: '10 minutes', // It's a long-running task
      });
      return result as { videoUrl: string };
    } catch (error) {
      this.logger.error(`videoGenerationWorkflow failed: ${workflowId}`, error);
      if (error instanceof WorkflowFailedError) {
        // More specific error handling for workflow failures
        throw new HttpException(`Video generation failed: ${error.cause?.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException('Failed to generate video ad.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  // NOTE: Synchronous, fast AI calls can remain here if they don't benefit from orchestration.
  // For this refactoring, we assume all GenAI tasks are now workflows. If some are simple,
  // the old logic of calling the genai-service directly would be here.
  
  async generateCardStory(prompt: string): Promise<string> {
    const client = this.ensureClient();
    const workflowId = `card-story-${randomUUID()}`;
    this.logger.log(`Executing 'simpleTextGenerationWorkflow' for card story with ID: ${workflowId}`);
    try {
       const result = await client.workflow.execute('simpleTextGenerationWorkflow', {
        taskQueue: 'genai-task-queue',
        workflowId,
        args: [{ prompt }],
        workflowExecutionTimeout: '1 minute',
      });
      return result as string;
    } catch(error) {
        this.logger.error(`Card story generation workflow failed: ${workflowId}`, error);
        throw new HttpException('Failed to generate card story.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  async generateCardImage(input: GenerateCardImageInput): Promise<string> {
    const client = this.ensureClient();
    const workflowId = `card-image-${randomUUID()}`;
    this.logger.log(`Executing 'imageGenerationWorkflow' for card image with ID: ${workflowId}`);
     try {
       const result = await client.workflow.execute('imageGenerationWorkflow', {
        taskQueue: 'genai-task-queue',
        workflowId,
        args: [input],
        workflowExecutionTimeout: '2 minutes',
      });
      // The workflow is expected to return a data URI string
      return result as string;
    } catch(error) {
        this.logger.error(`Card image generation workflow failed: ${workflowId}`, error);
        throw new HttpException('Failed to generate card image.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async askAIAdvisor(input: AskAIAdvisorInput): Promise<any> {
    const client = this.ensureClient();
    const workflowId = `advisor-chat-${randomUUID()}`;
    this.logger.log(`Executing 'chatWorkflow' for AI advisor with ID: ${workflowId}`);
    try {
      const result = await client.workflow.execute('chatWorkflow', {
        taskQueue: 'genai-task-queue',
        workflowId,
        args: [input],
        workflowExecutionTimeout: '2 minutes',
      });
      return result;
    } catch(error) {
        this.logger.error(`AI Advisor chat workflow failed: ${workflowId}`, error);
        throw new HttpException('Failed to get response from AI Advisor.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
