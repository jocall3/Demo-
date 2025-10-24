import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  InlineDataPart,
} from '@google/generative-ai';

// --- Input types for service methods, mirroring what GraphQL inputs would provide ---

export interface TextInput {
  prompt: string;
}

export interface ChatInput {
  history: Content[];
  newMessage: string;
}

export interface ImageInput {
  prompt: string;
}

export interface EditImageInput {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

export interface VideoInput {
  prompt: string;
  settings: Record<string, any>;
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

  async generateText({ prompt }: TextInput): Promise<string> {
    try {
      this.logger.log(`Generating text for prompt: "${prompt.substring(0, 50)}..."`);
      const result = await this.textModel.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error(`Error in generateText`, error.stack);
      throw new Error('Failed to generate text from AI service.');
    }
  }

  async continueChat({ history, newMessage }: ChatInput): Promise<Part[]> {
    try {
      this.logger.log(`Continuing chat. History length: ${history.length}`);
      const chat = this.textModel.startChat({ history });
      const result = await chat.sendMessage(newMessage);
      return result.response.parts || [];
    } catch (error) {
      this.logger.error('Error in chat conversation', error.stack);
      throw new Error('Failed to get chat response from AI service.');
    }
  }

  async generateImage({ prompt }: ImageInput): Promise<{ imageBase64: string; mimeType: string }> {
    this.logger.log(`Simulating image generation for prompt: "${prompt}"`);
    try {
      // Simulate generation time. In a real scenario, this would call an image model.
      await new Promise((resolve) => setTimeout(resolve, 4000));
      this.logger.log('Image generation simulation successful.');
      // Return a placeholder transparent PNG as a base64 string
      const placeholderBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      return { imageBase64: placeholderBase64, mimeType: 'image/png' };
    } catch (error) {
      this.logger.error('Error during image generation simulation.', error.stack);
      throw new Error('Failed to generate image with AI service.');
    }
  }

  async editImage({ prompt, imageBase64, mimeType }: EditImageInput): Promise<{ imageBase64: string; mimeType: string }> {
    const imagePart: InlineDataPart = { inlineData: { data: imageBase64, mimeType } };
    this.logger.log(`Editing image with prompt: "${prompt.substring(0, 50)}..."`);
    try {
      // This uses the vision model to simulate analyzing the image and prompt.
      // The actual image editing would require a different model or API.
      await this.visionModel.generateContent([prompt, imagePart]);
      // For this simulation, we'll return the original image to show the flow is working.
      this.logger.log('Image edit simulation successful.');
      return { imageBase64, mimeType };
    } catch (error) {
      this.logger.error('Error editing image.', error.stack);
      throw new Error('Failed to edit image with AI service.');
    }
  }

  async generateVideo({ prompt, settings }: VideoInput): Promise<{ videoUri: string }> {
    this.logger.log(`Starting video generation for prompt: "${prompt}"`);
    const operationId = `op-vid-${Date.now()}`;
    // This simulates a long-running operation that a client would poll.
    // The service layer encapsulates this, making it a single long-lived request.
    try {
      this.logger.log(`(Simulation) Task started, operation ID: ${operationId}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.logger.log(`(Simulation) Polling status for ${operationId}...`);
      await new Promise((resolve) => setTimeout(resolve, 8000));
      this.logger.log(`(Simulation) Operation ${operationId} has completed.`);
      const videoUri = 'https://storage.googleapis.com/demobank-assets/ai-ads/mock-video.mp4';
      return { videoUri };
    } catch (error) {
      this.logger.error(
        `Error during video generation process for operation ${operationId}`,
        error.stack,
      );
      throw new Error('Failed to generate video from AI service.');
    }
  }
}
