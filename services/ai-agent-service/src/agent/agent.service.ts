import { Inject, Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
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

/**
 * @Injectable()
 * `AgentService` is the core of the AI Agent microservice. It encapsulates all business logic
 * for interacting with the underlying generative AI provider (Google Gemini) and provides
 * primitive AI operations. These operations serve as "activities" for Temporal workflows
 * or are directly consumed by GraphQL resolvers for synchronous tasks.
 */
@Injectable()
export class AgentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentService.name);
  private genAI: GoogleGenerativeAI;
  private textModel: GenerativeModel;
  private visionModel: GenerativeModel;
  private gatewayUrl: string; // Still needed for proactive analysis activity

  constructor(
    private readonly configService: ConfigService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GOOGLE_GEMINI_API_KEY');
    if (!apiKey) {
      const errorMessage =
        'GOOGLE_GEMINI_API_KEY is not configured. The AI Agent Service will not function.';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // This URL is needed for the 'proactiveFinancialAnalysisWorkflow' activity implementation.
    this.gatewayUrl = this.configService.get<string>('API_GATEWAY_URL');
    if (!this.gatewayUrl) {
      this.logger.warn('API_GATEWAY_URL is not configured. Proactive analysis activity might be limited.');
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.textModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
      this.logger.log('AI Agent Service initialized successfully with Google Gemini models.');

      // Connect Kafka client (important for activities that might emit events directly)
      this.kafkaClient.connect().then(() => {
        this.logger.log('Kafka client connected in AgentService.');
      }).catch(err => {
        this.logger.error('Failed to connect Kafka client in AgentService onModuleInit.', err);
      });

    } catch (error) {
      this.logger.error('Failed to initialize Google Generative AI client.', error.stack);
      throw error;
    }
  }

  // --- Core AI Primitive Methods (used by Resolvers and Temporal Activities) ---

  /**
   * Generates a text response from the configured text AI model.
   * This is a fundamental AI primitive used for various text generation tasks.
   * @param input - The prompt for text generation.
   * @returns A promise that resolves to the generated text string.
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
   * Continues a chat conversation by sending a new message and incorporating past history.
   * @param input - The conversation history and the new message from the user.
   * @returns A promise that resolves to an array of `Part` objects from the AI's response.
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
   * Edits an existing image or generates a new one based on a prompt and an optional base image.
   * Currently, Google Gemini's vision model primarily supports multimodal *input* for analysis,
   * not direct image *generation/editing* from a prompt. This method simulates the process.
   * @param input - The prompt, base image (base64), and its MIME type.
   * @returns A promise that resolves to an object containing the (simulated) edited image's base64 data and MIME type.
   */
  async editImage(input: EditImageInput): Promise<{ imageBase64: string; mimeType: string }> {
    const { prompt, imageBase64, mimeType } = input;
    const imagePart: InlineDataPart = { inlineData: { data: imageBase64, mimeType } };
    
    this.logger.log(`Editing image with prompt: "${prompt.substring(0, 60)}..."`);
    try {
      // Simulate calling a model that processes the image and prompt.
      // NOTE: gemini-pro-vision does not actually output an edited image.
      // For a real implementation, a different AI model or API (e.g., DALL-E, Stable Diffusion) would be used.
      await this.visionModel.generateContent([prompt, imagePart]); // Still useful for multimodal understanding
      
      this.logger.log('Image edit simulation successful (NOTE: gemini-pro-vision does not actually edit images).');
      // For the simulation, return the original image, as no actual edit is performed by Gemini.
      return { imageBase64, mimeType }; 
    } catch (error) {
      this.logger.error('Error editing image.', error.stack);
      throw new Error('Failed to edit image with AI service.');
    }
  }

  /**
   * Initiates a long-running video generation task.
   * This is a simulated process as direct video generation is complex and external.
   * It simulates the initial call, an internal polling phase, and a final result.
   * @param input - The prompt and settings for video generation.
   * @returns A promise that resolves to an object containing an operation ID and a URL to the (mock) generated video.
   */
  async generateVideo(input: GenerateVideoInput): Promise<{ videoUri: string; operationId: string }> {
    const { prompt } = input;
    const operationId = `video-op-${Date.now()}`;
    this.logger.log(`Starting video generation for prompt: "${prompt.substring(0, 60)}..."`);
    
    // Simulate initial setup time
    await new Promise(resolve => setTimeout(resolve, 1500));
    this.logger.log(`[${operationId}] Simulation: Polling for status...`);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 8000));
    this.logger.log(`[${operationId}] Simulation: Video generation completed.`);
    
    const videoUri = 'https://storage.googleapis.com/demobank-mock-assets/ai-ads/mock-video.mp4';
    return { videoUri, operationId };
  }

  /**
   * Retrieves the status of a previously initiated video generation task.
   * In this simplified model, it always immediately returns a 'completed' status with a mock URL,
   * as `generateVideo` itself is already a synchronous-ish polling wrapper.
   * @param operationId - The unique ID of the video generation operation.
   * @returns A promise that resolves to the current status and URL of the video.
   */
  async getVideoGenerationStatus(operationId: string): Promise<VideoGenerationResult> {
    this.logger.log(`Checking status for video operation ${operationId}. Returning simulated completion.`);
    return {
        operationId,
        status: 'completed',
        videoUri: 'https://storage.googleapis.com/demobank-mock-assets/ai-ads/mock-video.mp4'
    };
  }

  // --- Temporal Activity Implementations (called by Temporal Worker) ---
  // These methods directly implement the logic for specific workflow steps.
  // They are typically registered with the Temporal Worker via a factory, not directly exposed by GraphQL.

  /**
   * Activity: Generates high-level feedback for a business plan.
   * This calls the core `generateText` method to perform the AI task.
   * @param businessPlan - The business plan text.
   * @returns The AI-generated feedback.
   */
  async generateBusinessPlanFeedback(businessPlan: string): Promise<string> {
    this.logger.log(`[Activity] Generating feedback for business plan: "${businessPlan.substring(0, 50)}..."`);
    const prompt = `Provide concise, high-level feedback on the following business plan: "${businessPlan}"`;
    return this.generateText({ prompt });
  }

  /**
   * Activity: Generates critical questions for a business plan and parses them into a structured format.
   * This activity demonstrates parsing structured AI output.
   * @param businessPlan - The business plan text.
   * @returns An array of structured questions.
   * @throws {Error} if the AI response cannot be parsed as valid JSON.
   */
  async generateBusinessPlanQuestions(businessPlan: string): Promise<any[]> {
    this.logger.log(`[Activity] Generating questions for business plan: "${businessPlan.substring(0, 50)}..."`);
    const prompt = `Based on the business plan provided, generate 3 critical questions a Venture Capitalist might ask. Categorize each question into 'Market', 'Finance', or 'Operations'. Your response must be a valid JSON array of objects, where each object has "id" (a UUID), "question", and "category" keys. Plan: "${businessPlan}"`;
    const questionsText = await this.generateText({ prompt });

    const cleanedJson = questionsText.replace(/```json|```/g, '').trim();
    try {
      const questions = JSON.parse(cleanedJson);
      this.logger.log(`[Activity] Successfully parsed ${questions.length} questions.`);
      return questions;
    } catch (error) {
      this.logger.error('Failed to parse JSON response for business plan questions.', { rawResponse: questionsText, cleanedResponse: cleanedJson, error: error.message });
      throw new Error('AI returned a malformed JSON response for questions.');
    }
  }

  /**
   * Activity: Performs proactive financial analysis for a user.
   * This activity demonstrates making an outbound HTTP call to another service (API Gateway/BFF)
   * to fetch user data, then processing it with AI, and finally emitting an event.
   * @param userId - The ID of the user for whom to perform analysis.
   * @returns A promise that resolves when the analysis is complete and an event is emitted.
   */
  async runProactiveFinancialAnalysisActivity(userId: string): Promise<void> {
    this.logger.log(`[Activity] Running proactive financial analysis for user ${userId}`);

    if (!this.gatewayUrl) {
      this.logger.error('[Activity] Cannot run proactive analysis: API_GATEWAY_URL is not configured.');
      throw new Error('API Gateway URL not configured for proactive analysis.');
    }

    try {
      // This query should ideally be to a dedicated read-model service, not the full API Gateway.
      const query = `query GetUserTransactions($id: ID!) { user(id: $id) { transactions(filter: { limit: 50 }) { description amount category date } } }`;
      
      const response = await firstValueFrom(
        this.httpService.post(this.gatewayUrl, { query, variables: { id: userId } })
      );
      const transactions = response.data?.data?.user?.transactions;

      if (!transactions) {
        this.logger.warn(`[Activity] No transactions found for user ${userId}. Skipping analysis.`);
        return;
      }
      const transactionsSummary = JSON.stringify(transactions.slice(0, 10)); // Summarize to fit context window

      const prompt = `Analyze these recent financial transactions and provide one critical insight or savings opportunity for the user. Be concise. Transactions: ${transactionsSummary}`;
      const insight = await this.generateText({ prompt });

      this.kafkaClient.emit('ai.insight.generated', {
          userId,
          insight,
          type: 'proactive_financial_analysis',
          timestamp: new Date().toISOString()
      });
      this.logger.log(`[Activity] Generated proactive financial insight for user ${userId}.`);
    } catch (error) {
      this.logger.error(`[Activity] Error during proactive financial analysis for user ${userId}`, error.stack);
      this.kafkaClient.emit('ai.insight.generation.failed', { userId, type: 'proactive_financial_analysis', error: error.message });
      throw error; // Re-throw to signal activity failure to Temporal
    }
  }

  /**
   * Activity: Generates a narrative/story for a custom bank card design.
   * @param userId - The ID of the user.
   * @param prompt - The prompt describing the card design.
   * @returns A promise that resolves when the story is generated and an event is emitted.
   */
  async generateCardStoryActivity(userId: string, prompt: string): Promise<void> {
    this.logger.log(`[Activity] Starting card story generation for user ${userId}`);
    try {
        const story = await this.generateText({ prompt });
        this.kafkaClient.emit('ai.card.story.generated', { userId, prompt, story, status: 'success' });
        this.logger.log(`[Activity] Successfully generated card story for user ${userId}.`);
    } catch (error) {
        this.logger.error(`[Activity] Error during card story generation for user ${userId}`, error.stack);
        this.kafkaClient.emit('ai.card.story.generation.failed', { userId, prompt, error: error.message });
        throw error; // Re-throw to signal activity failure to Temporal
    }
  }

  async onModuleDestroy() {
    await this.kafkaClient.close();
    this.logger.log('Kafka client disconnected from AgentService.');
  }
}
