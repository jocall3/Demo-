import { Args, Mutation, Resolver, InputType, Field, Int, ObjectType } from '@nestjs/graphql';
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { GenaiService } from './genai.service';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { Content, Part } from '@google/generative-ai';
import { Stream } from 'stream';

// --- GraphQL Input and Object Types ---
// These classes define the shape of data for GraphQL mutations, replacing the REST DTOs.

@InputType()
class GenerateAdVideoInput {
  @Field()
  prompt: string;

  @Field({ nullable: true })
  style?: string;

  @Field(() => Int, { nullable: true })
  length?: number;

  @Field({ nullable: true })
  voice?: string;
}

@InputType()
class GenerateCardImageInput {
  @Field(() => GraphQLUpload)
  baseImage: Promise<FileUpload>;

  @Field()
  prompt: string;
}

@ObjectType()
class AIAdvisorMessagePart {
  @Field({ nullable: true })
  text?: string;
}

@ObjectType()
class AIAdvisorMessage {
  @Field()
  id: string;

  @Field()
  role: string;

  @Field(() => [AIAdvisorMessagePart])
  parts: AIAdvisorMessagePart[];

  @Field()
  timestamp: Date;
}

@ObjectType()
class AIAdvisorResponse {
  @Field(() => [AIAdvisorMessage])
  messages: AIAdvisorMessage[];
}

@ObjectType()
class VideoGenerationResult {
  @Field()
  operationId: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  videoUrl?: string;
}

/**
 * GenaiResolver
 * 
 * This resolver replaces the REST-based `GenaiController` to expose GenAI capabilities
 * through a GraphQL API, in alignment with the new federated architecture.
 * It implements mutations defined in the GraphQL schema for text, chat, video, and image generation.
 */
@Resolver('GenAI')
@UsePipes(new ValidationPipe({ transform: true }))
export class GenaiResolver {
  private readonly logger = new Logger(GenaiResolver.name);
  // In-memory store for conversations for demonstration purposes.
  // In a real application, this would be a persistent store like Redis.
  private conversations: Map<string, Content[]> = new Map();

  constructor(private readonly genaiService: GenaiService) {}

  @Mutation(() => String, {
    description: 'Generates a short story for a custom card design.',
  })
  async generateCardStory(@Args('prompt') prompt: string): Promise<string> {
    return this.genaiService.generateText({ prompt });
  }

  @Mutation(() => AIAdvisorResponse, {
    description: 'Sends a message to the AI Financial Advisor and gets a response.',
  })
  async askAIAdvisor(
    @Args('message') message: string,
    @Args('conversationId', { type: () => String, nullable: true }) conversationId?: string,
  ): Promise<AIAdvisorResponse> {
    const currentConversationId = conversationId || `conv-${Date.now()}`;
    const history = this.conversations.get(currentConversationId) || [];

    const responseParts = await this.genaiService.continueChat({
      history,
      newMessage: message,
    });

    const userMessage: Content = { role: 'user', parts: [{ text: message }] };
    const modelResponse: Content = { role: 'model', parts: responseParts };

    const newHistory = [...history, userMessage, modelResponse];
    this.conversations.set(currentConversationId, newHistory);

    const messages: AIAdvisorMessage[] = newHistory.map((content, i) => ({
      id: `${currentConversationId}-${i}`,
      role: content.role,
      parts: content.parts.map(part => ({ text: (part as any).text })),
      timestamp: new Date(),
    }));

    return { messages };
  }

  @Mutation(() => VideoGenerationResult, {
    description: 'Generates a video ad based on a prompt.',
  })
  async generateAdVideo(
    @Args('input') input: GenerateAdVideoInput,
  ): Promise<VideoGenerationResult> {
    const { prompt, ...settings } = input;
    const result = await this.genaiService.generateVideo({ prompt, settings });
    
    return {
      operationId: `op-vid-${Date.now()}`,
      status: 'COMPLETED',
      videoUrl: result.videoUri,
    };
  }

  @Mutation(() => VideoGenerationResult, {
    description: 'Checks the status of a video generation operation.',
  })
  async checkVideoGenerationStatus(
    @Args('operationId') operationId: string,
  ): Promise<VideoGenerationResult> {
    this.logger.log(`Checking status for ${operationId}`);
    // The `generateVideo` service method already polls and waits for the final result.
    // This mutation is provided for schema completeness and returns a mock success state.
    return {
      operationId,
      status: 'COMPLETED',
      videoUrl: 'https://videostorage.googleapis.com/mock-video.mp4',
    };
  }

  @Mutation(() => String, {
    description: 'Generates a custom image for a bank card using AI image editing.',
  })
  async generateCardImage(
    @Args('input') { baseImage, prompt }: GenerateCardImageInput,
  ): Promise<string> {
    const { createReadStream, mimetype } = await baseImage;
    const stream: Stream = createReadStream();
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const buffer = Buffer.concat(chunks);
    const imageBase64 = buffer.toString('base64');

    const result = await this.genaiService.editImage({
      prompt,
      imageBase64,
      mimeType: mimetype,
    });

    // Return the image as a data URI string
    return `data:${result.mimeType};base64,${result.imageBase64}`;
  }
}
