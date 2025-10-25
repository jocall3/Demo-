import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as TemporalClient } from '@temporalio/client';
import { randomUUID } from 'crypto';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  InlineDataPart,
} from '@google/generative-ai';

import { TEMPORAL_CLIENT } from '../temporal/temporal.constants';
import {
  videoGenerationWorkflow,
  VideoGenerationWorkflowInput,
} from '../temporal/workflows';

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

/**
 * @Injectable()
 * `AgentService` is the application service within the Hexagonal Architecture for the AI Agent domain.
 * It serves two primary roles:
 * 1. It acts as an adapter to the external Google Gemini AI API, providing a set of core AI primitive methods
 *    (e.g., `generateText`, `continueChat`). These primitives are consumed by both GraphQL resolvers (for synchronous tasks)
 *    and Temporal activities (for steps in asynchronous workflows).
 * 2. It acts as a client to the Temporal workflow orchestration engine, encapsulating the logic for starting and
 *    querying long-running, durable workflows (e.g., video generation), as directed by the `Implement a Durable Saga Pattern` directive.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;

  constructor(
    private readonly configService: ConfigService,
    @Inject(TEMPORAL_CLIENT) private readonly temporalClient: TemporalClient,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY');
    if (!apiKey) {
      const errorMessage =
        'GOOGLE_GEMINI_API_KEY is not configured. The AI Agent Service will not function.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
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

  // --- Core AI Primitive Methods (for Resolvers and Activities) ---

  async generateText(input: GenerateTextInput): Promise<string> {
    const { prompt } = input;
    try {
      this.logger.debug(`Generating text for prompt: "${prompt.substring(0, 60)}..."`);
      const result = await this.textModel.generateContent(prompt);
      const text = result.response.text();
      this.logger.debug('Successfully generated text response.');
      return text;
    } catch (error) {
      this.logger.error(`Error in generateText for prompt: "${prompt.substring(0, 60)}..."`, error.stack);
      throw new Error('Failed to generate text from AI service.');
    }
  }

  async continueChat(input: ChatInput): Promise<Part[]> {
    const { history, newMessage } = input;
    try {
      this.logger.debug(`Continuing chat. History length: ${history.length}. New message: "${newMessage.substring(0, 60)}..."`);
      const chat = this.textModel.startChat({ history });
      const result = await chat.sendMessage(newMessage);
      this.logger.debug('Successfully received chat response from AI model.');
      return result.response.parts;
    } catch (error) {
      this.logger.error('Error during chat conversation.', error.stack);
      throw new Error('Failed to get chat response from AI service.');
    }
  }

  async editImage(input: EditImageInput): Promise<{ imageBase64: string; mimeType: string }> {
    const { prompt, imageBase64, mimeType } = input;
    const imagePart: InlineDataPart = { inlineData: { data: imageBase64, mimeType } };
    this.logger.debug(`Editing image with prompt: "${prompt.substring(0, 60)}..."`);
    try {
      // NOTE: gemini-pro-vision does not actually output an edited image. This simulates
      // an image editing pipeline where the image and prompt are sent for analysis/processing.
      // A real implementation would use a model like Imagen or DALL-E.
      await this.visionModel.generateContent([prompt, imagePart]);
      this.logger.log('Image edit simulation successful.');
      return { imageBase64, mimeType };
    } catch (error) {
      this.logger.error('Error processing image with AI vision model.', error.stack);
      throw new Error('Failed to process image with AI service.');
    }
  }

  // --- Temporal Workflow Client Methods (for GraphQL Resolvers) ---

  async startVideoGenerationWorkflow(input: VideoGenerationWorkflowInput): Promise<{ workflowId: string; status: string }> {
    const workflowId = `video-gen-${input.userId}-${randomUUID()}`;
    this.logger.log(`Starting 'videoGenerationWorkflow' with ID: ${workflowId}`);
    await this.temporalClient.workflow.start(videoGenerationWorkflow, {
      taskQueue: 'ai-agent-tasks',
      workflowId,
      args: [input],
      workflowExecutionTimeout: '10 minutes',
    });
    return { workflowId, status: 'STARTED' };
  }

  async queryVideoGenerationWorkflowStatus(workflowId: string): Promise<any> {
    this.logger.debug(`Querying status for workflow ID: ${workflowId}`);
    const handle = this.temporalClient.workflow.getHandle(workflowId);
    const description = await handle.describe();
    const status = description.status.name;

    let result: any = { operationId: workflowId, status };

    if (status === 'COMPLETED') {
      const workflowResult = await handle.result();
      result.videoUrl = workflowResult.videoUrl;
    } else if (status === 'FAILED') {
      try {
        await handle.result(); // This throws the failure
      } catch (e: any) {
        result.errorMessage = e.cause?.message || e.message || 'Workflow failed with an unknown error.';
      }
    }
    return result;
  }
}
