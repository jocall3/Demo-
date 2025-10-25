import { Inject, Injectable, OnModuleInit, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  InlineDataPart,
} from '@google/generative-ai';
import { KAFKA_CLIENT } from '../../event-bus/event-bus.module';
import { v4 as uuidv4 } from 'uuid';

/**
 * @class AgentService
 * @description This class serves as the core application service for the AI Agent microservice,
 * adhering to Hexagonal Architecture. Its public methods encapsulate the business logic for
 * interacting with the underlying generative AI provider (Google Gemini). These methods
 * are designed to be used as **Temporal Activities**, representing single, idempotent, and
 * retryable units of work within a larger, durable workflow. This service is isolated
 * from external concerns like GraphQL resolvers or specific workflow definitions.
 *
 * @see {@link ../../temporal/activities} - Where these methods are composed into activities.
 * @see {@link ../../temporal/workflows} - Where workflows orchestrate these activities.
 */
@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;

  /**
   * @constructor
   * @param {ConfigService} configService - Injected service for accessing configuration and environment variables.
   * @param {ClientKafka} kafkaClient - Injected Kafka client for publishing events from within activities.
   */
  constructor(
    private readonly configService: ConfigService,
    @Inject(KAFKA_CLIENT) private readonly kafkaClient: ClientKafka,
  ) {}

  /**
   * @method onModuleInit
   * @description Initializes the Google Generative AI client when the module loads.
   * It fetches the API key from the configuration and sets up the different AI models.
   * @throws {Error} If the GOOGLE_GEMINI_API_KEY is not configured.
   */
  onModuleInit() {
    const apiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY');
    if (!apiKey) {
      const errorMessage = 'GOOGLE_GEMINI_API_KEY is not configured. The AI Agent Service will not function.';
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

  // =======================================================================
  // == METHODS DESIGNED AS TEMPORAL ACTIVITY IMPLEMENTATIONS             ==
  // =======================================================================

  /**
   * (Activity Implementation) Generates a simple text response from a given prompt.
   * @param {string} prompt The input prompt for the AI model.
   * @returns {Promise<string>} A promise that resolves to the generated text content.
   */
  async generateText(prompt: string): Promise<string> {
    try {
      this.logger.debug(`[Activity] Generating text for prompt: "${prompt.substring(0, 50)}..."`);
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error(`[Activity] Error in generateText`, error.stack);
      throw new HttpException('Failed to generate text from AI service.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * (Activity Implementation) Continues a chat conversation by sending a new message with history.
   * @param {{ history: Content[]; newMessage: string }} input The conversation context.
   * @returns {Promise<Part[]>} A promise that resolves to the parts of the AI's response message.
   */
  async continueChat(input: { history: Content[]; newMessage: string }): Promise<Part[]> {
    const { history, newMessage } = input;
    try {
      this.logger.debug(`[Activity] Continuing chat. History length: ${history.length}.`);
      const chat = this.textModel.startChat({ history });
      const result = await chat.sendMessage(newMessage);
      return result.response.parts;
    } catch (error) {
      this.logger.error('[Activity] Error during chat conversation.', error.stack);
      throw new HttpException('Failed to get chat response from AI service.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * (Activity Implementation) Analyzes an image with a text prompt using a vision model.
   * @param {{ prompt: string; imageBase64: string; mimeType: string }} input The image and prompt for analysis.
   * @returns {Promise<string>} The AI's text analysis of the image.
   */
  async analyzeImageWithPrompt(input: { prompt: string; imageBase64: string; mimeType: string }): Promise<string> {
    const { prompt, imageBase64, mimeType } = input;
    const imagePart: InlineDataPart = { inlineData: { data: imageBase64, mimeType } };

    this.logger.debug(`[Activity] Analyzing image with prompt: "${prompt.substring(0, 50)}..."`);
    try {
      const result = await this.visionModel.generateContent([prompt, imagePart]);
      return result.response.text();
    } catch (error) {
      this.logger.error('[Activity] Error analyzing image with prompt.', error.stack);
      throw new HttpException('Failed to analyze image with AI service.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * (Activity Implementation) Initiates a long-running video generation task (simulated).
   * @param {{ prompt: string; userId: string }} input The prompt and user ID.
   * @returns {Promise<string>} A unique operation ID for tracking the video generation process.
   */
  async initiateVideoGeneration(input: { prompt: string; userId: string }): Promise<string> {
    const operationId = `video-gen-${uuidv4()}`;
    this.logger.log(`[Activity] Initiating video generation for user ${input.userId}. Operation ID: ${operationId}`);
    // In a real system, this would call an external video generation API
    // and store the operationId in a database, associated with the external task ID.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call latency
    return operationId;
  }

  /**
   * (Activity Implementation) Polls the status of a video generation task (simulated).
   * @param {string} operationId The ID of the operation to check.
   * @returns {Promise<{ status: 'processing' | 'completed' | 'failed', videoUrl?: string }>} The current status.
   */
  async pollVideoStatus(operationId: string): Promise<{ status: 'processing' | 'completed' | 'failed', videoUrl?: string }> {
    this.logger.log(`[Activity] Polling status for video generation: ${operationId}`);
    // Simulate checking status from an external service.
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate a random outcome for demonstration purposes.
    const random = Math.random();
    if (random < 0.7) { // 70% chance to still be processing
      return { status: 'processing' };
    } else if (random < 0.95) { // 25% chance to be completed
      return { status: 'completed', videoUrl: 'https://storage.googleapis.com/demobank-mock-assets/ai-ads/mock-video.mp4' };
    } else { // 5% chance to fail
      return { status: 'failed' };
    }
  }

  /**
   * (Activity Implementation) Publishes an event to the message bus (Kafka).
   * This isolates the Kafka client interaction into a dedicated, retryable activity.
   * @param {{ topic: string; payload: Record<string, any> }} input The event topic and payload.
   * @returns {Promise<void>}
   */
  async emitEvent(input: { topic: string; payload: Record<string, any> }): Promise<void> {
    const { topic, payload } = input;
    this.logger.log(`[Activity] Emitting event to topic '${topic}'`);
    try {
      // `emit` returns an Observable, so we convert it to a Promise for Temporal compatibility.
      await this.kafkaClient.emit(topic, JSON.stringify(payload)).toPromise();
      this.logger.debug(`[Activity] Successfully emitted event to topic '${topic}'.`);
    } catch (error) {
      this.logger.error(`[Activity] Failed to emit event to topic '${topic}'.`, error.stack);
      // Re-throw to allow Temporal to handle the activity failure according to its retry policy.
      throw error;
    }
  }
}
