import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  InlineDataPart,
} from '@google/generative-ai';

// --- Input types for service methods, mirroring the GraphQL schema ---

// Corresponds to GenerateAdVideoInput
export interface GenerateAdVideoInput {
  prompt: string;
  style?: string;
  length?: number;
  voice?: string;
}

// Corresponds to GenerateCardImageInput
export interface GenerateCardImageInput {
  imageBase64: string;
  mimeType: string;
  prompt: string;
}

// Input for the askAIAdvisor method
export interface AskAIAdvisorInput {
  history: Content[];
  message: string;
}

// Response from the askAIAdvisor method, aligning with GraphQL type
export interface AIAdvisorMessage {
  id: string;
  role: 'user' | 'model';
  parts: Part[];
  timestamp: Date;
}

// Response from generateAdVideo
export interface VideoGenerationResult {
  operationId: string;
  status: 'generating' | 'done' | 'error';
  videoUrl?: string;
}

@Injectable()
export class GenaiService implements OnModuleInit {
  private readonly logger = new Logger(GenaiService.name);
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      const errorMessage =
        'GEMINI_API_KEY is not configured. GenAI features will be unavailable.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.textModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    this.logger.log('GenAI Service Initialized Successfully');
  }

  async generateCardStory(prompt: string): Promise<string> {
    try {
      this.logger.log(`Generating card story for prompt: "${prompt.substring(0, 50)}..."`);
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error(`Error in generateCardStory`, error.stack);
      throw new Error('Failed to generate card story from AI service.');
    }
  }

  async askAIAdvisor({ history, message }: AskAIAdvisorInput): Promise<AIAdvisorMessage[]> {
    try {
      this.logger.log(`Continuing chat. History length: ${history.length}`);
      const chat = this.textModel.startChat({ history });
      const result = await chat.sendMessage(message);
      
      const aiResponse: AIAdvisorMessage = {
          id: `model_${Date.now()}`,
          role: 'model',
          parts: result.response.parts || [],
          timestamp: new Date()
      };

      return [aiResponse];
    } catch (error) {
      this.logger.error('Error in chat conversation', error.stack);
      throw new Error('Failed to get chat response from AI service.');
    }
  }

  async generateCardImage({ prompt, imageBase64, mimeType }: GenerateCardImageInput): Promise<string> {
    const imagePart: InlineDataPart = { inlineData: { data: imageBase64, mimeType } };
    this.logger.log(`Editing image with prompt: "${prompt.substring(0, 50)}..."`);
    try {
      // This uses the vision model to simulate analyzing the image and prompt.
      // The actual image editing would require a different model or API.
      await this.visionModel.generateContent([prompt, imagePart]);
      
      // For this simulation, we'll return the original image as a data URI to show the flow is working.
      this.logger.log('Image edit simulation successful.');
      return `data:${mimeType};base64,${imageBase64}`;
    } catch (error) {
      this.logger.error('Error editing image.', error.stack);
      throw new Error('Failed to edit image with AI service.');
    }
  }

  async generateAdVideo({ prompt }: GenerateAdVideoInput): Promise<VideoGenerationResult> {
    this.logger.log(`Starting video generation for prompt: "${prompt}"`);
    const operationId = `op-vid-${Date.now()}`;
    
    // This simulates a long-running operation. The service layer encapsulates this, 
    // making it a single long-lived request from the client's perspective (the gateway).
    try {
      this.logger.log(`(Simulation) Task started, operation ID: ${operationId}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.logger.log(`(Simulation) Polling status for ${operationId}...`);
      await new Promise((resolve) => setTimeout(resolve, 8000));
      this.logger.log(`(Simulation) Operation ${operationId} has completed.`);
      
      const videoUri = 'https://storage.googleapis.com/demobank-assets/ai-ads/mock-video.mp4';
      
      return {
          operationId,
          status: 'done',
          videoUrl: videoUri
      };
    } catch (error) {
      this.logger.error(
        `Error during video generation process for operation ${operationId}`,
        error.stack,
      );
      throw new Error('Failed to generate video from AI service.');
    }
  }
}
