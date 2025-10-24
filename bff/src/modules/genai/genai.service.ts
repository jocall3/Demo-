import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  InlineDataPart,
} from '@google/generative-ai';

// --- Input/Output Types for Service Methods (Aligned with GraphQL Schema) ---

/**
 * Corresponds to the 'askAIAdvisor' mutation input.
 */
export interface AskAIAdvisorInput {
  history: Content[];
  message: string;
}

/**
 * Represents a single message in a conversation, aligning with the GraphQL 'AIAdvisorMessage' type.
 */
export interface AIAdvisorMessage {
  id: string;
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: Date;
}

/**
 * Corresponds to the 'generateAdVideo' mutation input.
 */
export interface GenerateAdVideoInput {
  prompt: string;
  style?: string;
  length?: number;
  voice?: string;
}

/**
 * Corresponds to the 'VideoGenerationResult' type in GraphQL.
 */
export interface VideoGenerationResult {
  operationId: string;
  status: 'generating' | 'done' | 'error';
  videoUrl?: string;
}

/**
 * Input for the 'generateCardImage' service method, derived from the GraphQL mutation.
 */
export interface GenerateCardImageInput {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

/**
 * Service responsible for all interactions with Google's Generative AI APIs.
 * This service is designed to be consumed by GraphQL resolvers.
 */
@Injectable()
export class GenaiService implements OnModuleInit {
  private readonly logger = new Logger(GenaiService.name);
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('google.geminiApiKey') || this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('Google Gemini API Key is not configured. AI features will fail.');
      throw new Error('GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY must be configured in the environment.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.textModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    this.logger.log('GenAI Service Initialized Successfully');
  }

  /**
   * Generates a short story or descriptive text based on a prompt.
   * Used by the 'generateCardStory' GraphQL mutation.
   * @param prompt The text prompt for generation.
   * @returns A promise that resolves to the generated text string.
   */
  async generateCardStory(prompt: string): Promise<string> {
    try {
      this.logger.log(`Generating card story for prompt: "${prompt.substring(0, 50)}..."`);
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error(`Error in generateCardStory`, error.stack);
      throw new Error('Failed to generate story from AI service.');
    }
  }

  /**
   * Continues a conversation with the AI model, handling chat history.
   * Used by the 'askAIAdvisor' GraphQL mutation.
   * @param input The conversation history and the new user message.
   * @returns A promise that resolves to the AI's new message(s).
   */
  async askAIAdvisor(input: AskAIAdvisorInput): Promise<AIAdvisorMessage[]> {
    const { history, message } = input;
    try {
      this.logger.log(`Continuing AI Advisor chat. History length: ${history.length}`);
      const chat = this.textModel.startChat({ history });
      const result = await chat.sendMessage(message);

      const responseParts = result.response.parts;
      if (!responseParts) {
        return [];
      }

      // Construct a new message object from the AI's response.
      const textParts = responseParts
        .filter((part) => 'text' in part)
        .map((part) => ({ text: (part as { text: string }).text }));

      const newMessages: AIAdvisorMessage[] = [];

      if (textParts.length > 0) {
        newMessages.push({
          id: `ai_${Date.now()}`,
          role: 'model',
          parts: textParts,
          timestamp: new Date(),
        });
      }

      // In a real app, you would also handle function calls here.
      // For example, creating a separate message for a tool call visualization.

      return newMessages;
    } catch (error) {
      this.logger.error('Error in AI advisor conversation', error.stack);
      throw new Error('Failed to get chat response from AI service.');
    }
  }

  /**
   * Generates a custom image for a bank card by editing a base image with a prompt.
   * Used by the 'generateCardImage' GraphQL mutation.
   * @param input The prompt and the base image data.
   * @returns A promise that resolves to the URL of the newly generated image.
   */
  async generateCardImage(input: GenerateCardImageInput): Promise<string> {
    const { prompt, imageBase64, mimeType } = input;
    const imagePart: InlineDataPart = { inlineData: { data: imageBase64, mimeType } };
    this.logger.log('Simulating AI card image generation.');
    try {
      // In a real implementation, a dedicated image generation/editing model would be used.
      // This simulates the interaction for architectural demonstration.
      await this.visionModel.generateContent([prompt, imagePart]);

      // Simulate uploading the result to cloud storage and returning a public URL.
      const mockImageUrl = `https://storage.googleapis.com/demobank-assets/card-designs/custom-${Date.now()}.png`;
      this.logger.log(`Simulated image generated and uploaded to ${mockImageUrl}`);

      return mockImageUrl;
    } catch (error) {
      this.logger.error('Error generating card image.', error.stack);
      throw new Error('Failed to generate card image with AI service.');
    }
  }

  /**
   * Initiates and simulates a video generation task.
   * Used by the 'generateAdVideo' GraphQL mutation. This simulates a long-running request pattern.
   * @param input The parameters for the video generation.
   * @returns A promise that resolves to the final video generation result.
   */
  async generateAdVideo(input: GenerateAdVideoInput): Promise<VideoGenerationResult> {
    const { prompt } = input;
    const operationId = `video-gen-${Date.now()}`;
    this.logger.log(`Starting video generation for prompt: "${prompt}". Operation ID: ${operationId}`);

    // This simulates an async/polling flow within a single long-running request.
    try {
      // 1. Simulate initial API call to start the job
      await new Promise((resolve) => setTimeout(resolve, 1500));
      this.logger.log(`Polling status for operation: ${operationId}`);

      // 2. Simulate polling wait time
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // 3. Simulate successful completion
      this.logger.log(`Operation ${operationId} has completed.`);
      const videoUrl = 'https://storage.googleapis.com/demobank-assets/ai-ads/mock-video.mp4';

      return {
        operationId,
        status: 'done',
        videoUrl,
      };
    } catch (error) {
      this.logger.error(`Error during video generation process for prompt: "${prompt}"`, error.stack);
      // Return an error state that aligns with the GraphQL schema
      return {
        operationId,
        status: 'error',
      };
    }
  }
}
