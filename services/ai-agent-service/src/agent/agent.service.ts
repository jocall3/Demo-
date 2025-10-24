import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
  Part,
  InlineDataPart,
} from '@google/generative-ai';

// --- Input/Output DTOs for the service layer ---
// These will align with the inputs and outputs of the GraphQL layer (resolver).

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
  settings: Record<string, any>; // Simplified for this example
}

export interface VideoGenerationResult {
  operationId: string;
  status: 'processing' | 'completed' | 'failed';
  videoUri?: string;
}

/**
 * @Injectable()
 * `AgentService` is the core of the AI Agent microservice. It encapsulates all business logic
 * for interacting with the underlying generative AI provider (Google Gemini).
 * It is designed to be consumed by the `AgentResolver` in the GraphQL layer.
 */
@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;
  // In a real app, a video model would also be initialized.
  // private videoModel: GenerativeModel;

  constructor(private configService: ConfigService) {}

  /**
   * Initializes the Google Generative AI client when the module is loaded.
   * It fetches the API key from the configuration and sets up the different models.
   */
  onModuleInit() {
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

  /**
   * Generates a simple text response from a given prompt.
   * @param input - The input containing the prompt.
   * @returns The generated text content as a string.
   */
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

  /**
   * Continues a chat conversation with the AI model, maintaining history.
   * @param input - The chat history and the new user message.
   * @returns The model's response parts, which could include text or tool calls.
   */
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

  /**
   * Edits an image based on a base image and a text prompt.
   * @param input - The prompt, base64-encoded image, and its mime type.
   * @returns A base64 encoded edited image string and its mime type.
   */
  async editImage(input: EditImageInput): Promise<{ imageBase64: string; mimeType: string }> {
    const { prompt, imageBase64, mimeType } = input;
    const imagePart: InlineDataPart = { inlineData: { data: imageBase64, mimeType } };
    
    this.logger.log(`Editing image with prompt: "${prompt.substring(0, 60)}..."`);
    try {
      // In a real application, this would use a dedicated image-editing model and API.
      // Here, we simulate the interaction using the vision model.
      const result = await this.visionModel.generateContent([prompt, imagePart]);
      
      // For demonstration, we'll assume the model could return an edited image.
      // Since `gemini-pro-vision` doesn't edit images, we'll just log and return a mock response.
      this.logger.log('Image edit simulation successful (NOTE: gemini-pro-vision does not actually edit images).');

      // This would be replaced with actual processing of the model's output if it were an image model.
      // For now, we return a placeholder. In a real scenario, this would be the new base64 string.
      const mockEditedBase64 = imageBase64; 

      return { imageBase64: mockEditedBase64, mimeType };
    } catch (error) {
      this.logger.error('Error editing image.', error.stack);
      throw new Error('Failed to edit image with AI service.');
    }
  }

  /**
   * Generates a video from a text prompt (simulating a long-running operation).
   * @param input - The prompt and any video settings.
   * @returns An object containing the URI of the generated video.
   */
  async generateVideo(input: GenerateVideoInput): Promise<{ videoUri: string }> {
    const { prompt } = input;
    const operationId = `video-op-${Date.now()}`;
    this.logger.log(`Starting video generation for prompt: "${prompt.substring(0, 60)}...". Operation ID: ${operationId}`);

    try {
      // Step 1: Simulate initiating the video generation task with an API call.
      this.logger.log(`[${operationId}] Submitting video generation task to the provider.`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 2: Simulate polling for the result. A real implementation would use a job queue or webhook.
      let isDone = false;
      let attempts = 0;
      while (!isDone && attempts < 5) { // Poll up to 5 times
        await new Promise(resolve => setTimeout(resolve, 8000)); // 8-second polling interval
        attempts++;
        this.logger.log(`[${operationId}] Polling for status, attempt ${attempts}...`);
        isDone = Math.random() > 0.3; // Simulate a chance of completion
      }

      if (!isDone) {
        throw new Error('Video generation timed out after several polling attempts.');
      }

      // Step 3: Simulate retrieving the final result.
      this.logger.log(`[${operationId}] Video generation completed.`);
      const videoUri = 'https://storage.googleapis.com/demobank-mock-assets/ai-ads/mock-video.mp4';
      
      return { videoUri };
    } catch (error) {
      this.logger.error(`[${operationId}] Error during video generation process for prompt: "${prompt}"`, error.stack);
      throw new Error(`Failed to generate video. Operation ID: ${operationId}.`);
    }
  }
}
