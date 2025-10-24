import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Content, Part } from '@google/generative-ai';

// Input/Output interfaces matching the resolver's expectations.
// The BFF service acts as a pass-through and uses these to type its methods.
export interface GenerateTextInput {
  prompt: string;
}

export interface ContinueChatInput {
  history: Content[];
  newMessage: string;
}

export interface GenerateVideoInput {
  prompt: string;
  settings: Record<string, any>;
}

export interface EditImageInput {
  prompt: string;
  imageBase64: string;
  mimeType: string;
}

/**
 * Service to act as a client for the downstream GenAI microservice.
 * In the new architecture, this service is part of the API Gateway (BFF).
 * It is responsible for forwarding GenAI-related GraphQL requests to the appropriate subgraph,
 * abstracting away the direct calls to the Google AI SDK which now reside in the dedicated GenAI service.
 */
@Injectable()
export class GenaiService implements OnModuleInit {
  private readonly logger = new Logger(GenaiService.name);
  private genaiServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    // Retrieve the GenAI subgraph URL from the gateway configuration.
    const subgraphs = this.configService.get<any[]>('gateway.subgraphs', []);
    const genaiSubgraph = subgraphs.find((s) => s.name === 'genai');

    if (!genaiSubgraph?.url) {
      this.logger.error(
        'GenAI microservice URL is not configured in gateway.subgraphs.',
      );
      throw new Error('GenAI microservice URL is not configured.');
    }
    this.genaiServiceUrl = genaiSubgraph.url;
    this.logger.log(`GenAI Service client pointing to: ${this.genaiServiceUrl}`);
  }

  /**
   * A generic helper to execute a GraphQL mutation against the GenAI subgraph.
   * @param query The GraphQL mutation string.
   * @param variables The variables for the mutation.
   * @returns The data from the GraphQL response.
   */
  private async mutate<T>(
    query: string,
    variables: Record<string, any>,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(this.genaiServiceUrl, { query, variables }),
      );

      if (response.data.errors) {
        this.logger.error(
          'GraphQL error from GenAI service:',
          response.data.errors,
        );
        throw new HttpException(
          response.data.errors[0].message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return response.data.data;
    } catch (error) {
      this.logger.error(
        `Failed to call GenAI service at ${this.genaiServiceUrl}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Could not communicate with the GenAI service.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Forwards the generateText request to the GenAI subgraph.
   * Called by the `generateCardStory` mutation in the resolver.
   */
  async generateText(input: GenerateTextInput): Promise<string> {
    const mutation = `
      mutation GenerateText($prompt: String!) {
        generateText(prompt: $prompt) {
          text
        }
      }
    `;
    const data = await this.mutate<{ generateText: { text: string } }>(mutation, {
      prompt: input.prompt,
    });
    return data.generateText.text;
  }

  /**
   * Forwards the continueChat request to the GenAI subgraph.
   * Called by the `askAIAdvisor` mutation in the resolver.
   */
  async continueChat(input: ContinueChatInput): Promise<Part[]> {
    const mutation = `
      mutation ContinueChat($history: [ContentInput!]!, $newMessage: String!) {
        continueChat(history: $history, newMessage: $newMessage) {
          parts {
            text
          }
        }
      }
    `;
    // The service layer maps the `Content[]` type from the SDK (used by the resolver)
    // to a JSON-serializable `ContentInput[]` that the downstream GraphQL schema expects.
    const historyForGql = input.history.map((content) => ({
      role: content.role,
      parts: content.parts.map((part) => ({ text: (part as any).text })),
    }));

    const data = await this.mutate<{ continueChat: { parts: Part[] } }>(mutation, {
      history: historyForGql,
      newMessage: input.newMessage,
    });
    return data.continueChat.parts;
  }

  /**
   * Forwards the generateVideo request to the GenAI subgraph.
   * Called by the `generateAdVideo` mutation in the resolver.
   */
  async generateVideo(input: GenerateVideoInput): Promise<{ videoUri: string }> {
    const mutation = `
      mutation GenerateVideo($prompt: String!) {
        generateVideo(prompt: $prompt) {
          videoUri
        }
      }
    `;
    // The downstream schema currently only accepts a prompt, so we ignore other settings.
    const data = await this.mutate<{ generateVideo: { videoUri: string } }>(
      mutation,
      {
        prompt: input.prompt,
      },
    );
    return data.generateVideo;
  }

  /**
   * Forwards the editImage request to the GenAI subgraph.
   * Called by the `generateCardImage` mutation in the resolver.
   */
  async editImage(
    input: EditImageInput,
  ): Promise<{ imageBase64: string; mimeType: string }> {
    const mutation = `
      mutation EditImage($prompt: String!, $imageBase64: String!, $mimeType: String!) {
        editImage(prompt: $prompt, imageBase64: $imageBase64, mimeType: $mimeType) {
          imageBase64
          mimeType
        }
      }
    `;
    const data = await this.mutate<{
      editImage: { imageBase64: string; mimeType: string };
    }>(mutation, {
      prompt: input.prompt,
      imageBase64: input.imageBase64,
      mimeType: input.mimeType,
    });
    return data.editImage;
  }
}
