import { Args, Mutation, Resolver, InputType, Field, Int, ObjectType } from '@nestjs/graphql';
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { AgentService } from './agent.service';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { Content } from '@google/generative-ai';
import { Stream } from 'stream';

// --- GraphQL Input and Object Types ---
// These types define the shape of data for this subgraph's GraphQL mutations.
// They align with the types previously exposed by the BFF to ensure a smooth
// transition to the federated supergraph.

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
 * AgentResolver
 * 
 * This resolver provides the GraphQL API for the AI Agent Service.
 * As part of a federated subgraph, it exposes mutations for all generative AI
 * capabilities, including text, chat, video, and image generation.
 */
@Resolver('AIAgent')
@UsePipes(new ValidationPipe({ transform: true }))
export class AgentResolver {
  private readonly logger = new Logger(AgentResolver.name);
  // In-memory store for conversations for demonstration purposes.
  // In a production microservice, this would be a persistent, distributed
  // cache like Redis to handle state across multiple service instances.
  private conversations: Map<string, Content[]> = new Map();

  constructor(private readonly agentService: AgentService) {}

  @Mutation(() => String, {
    description: 'Generates a short story for a custom card design.',
  })
  async generateCardStory(@Args('prompt') prompt: string): Promise<string> {
    // The service layer abstracts the call to the underlying AI model.
    return this.agentService.generateText({ prompt });
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

    const responseParts = await this.agentService.continueChat({
      history,
      newMessage: message,
    });

    const userMessage: Content = { role: 'user', parts: [{ text: message }] };
    const modelResponse: Content = { role: 'model', parts: responseParts };

    // Update and store the conversation history.
    const newHistory = [...history, userMessage, modelResponse];
    this.conversations.set(currentConversationId, newHistory);

    // Map the internal Content[] format to the GraphQL AIAdvisorMessage[] type.
    const messages: AIAdvisorMessage[] = newHistory.map((content, i) => ({
      id: `${currentConversationId}-${i}`,
      role: content.role,
      parts: content.parts.map(part => ({ text: (part as any).text })), // Simple text mapping
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
    const result = await this.agentService.generateVideo({ prompt, settings });
    
    // The service handles the long-running operation and returns the final result.
    return {
      operationId: result.operationId || `op-vid-${Date.now()}`,
      status: 'COMPLETED', // Simplified status for the client
      videoUrl: result.videoUri,
    };
  }

  @Mutation(() => VideoGenerationResult, {
    description: 'Checks the status of a video generation operation.',
  })
  async checkVideoGenerationStatus(
    @Args('operationId') operationId: string,
  ): Promise<VideoGenerationResult> {
    this.logger.log(`Received status check for ${operationId}`);
    // In this architecture, the `generateVideo` service method is synchronous from the client's perspective
    // (it polls and waits for the final result). This mutation is kept for schema compatibility
    // and can be used for more complex async patterns in the future.
    return this.agentService.getVideoGenerationStatus(operationId);
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

    const result = await this.agentService.editImage({
      prompt,
      imageBase64,
      mimeType: mimetype,
    });

    // Return the generated image as a data URI string for easy client-side display.
    return `data:${result.mimeType};base64,${result.imageBase64}`;
  }
}
