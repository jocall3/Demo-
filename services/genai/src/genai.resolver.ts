import {
  Args,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Int,
} from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { GenaiService } from './genai.service';
import { Content } from '@google/generative-ai';

// =============================================================================
// GraphQL Object Types (Domain-Specific Responses)
// =============================================================================

@ObjectType({
  description: 'Represents a single part of a message in the AI Advisor conversation.',
})
class AIAdvisorMessagePart {
  @Field({ nullable: true })
  text?: string;
}

@ObjectType({ description: 'Represents a single message in the AI Advisor conversation.' })
class AIAdvisorMessage {
  @Field()
  id: string;

  @Field()
  role: string; // 'user' or 'model'

  @Field(() => [AIAdvisorMessagePart])
  parts: AIAdvisorMessagePart[];

  @Field()
  timestamp: Date;
}

@ObjectType({ description: 'The response from the AI Advisor, containing the full conversation history.' })
class AIAdvisorResponse {
  @Field(() => [AIAdvisorMessage])
  messages: AIAdvisorMessage[];
}

@ObjectType({ description: 'The result of an asynchronous video generation operation.' })
class VideoGenerationResult {
  @Field()
  operationId: string;

  @Field()
  status: string; // e.g., 'generating', 'done', 'error'

  @Field({ nullable: true })
  videoUrl?: string;
}

// =============================================================================
// GraphQL Input Types (Domain-Specific Arguments)
// =============================================================================

@InputType()
class GenerateAdVideoInput {
  @Field()
  prompt: string;

  @Field({ nullable: true })
  style?: string;

  @Field(() => Int, { nullable: true, description: 'Length of the video in seconds.' })
  length?: number;

  @Field({ nullable: true })
  voice?: string;
}

@InputType()
class GenerateCardImageInput {
  @Field({ description: 'The base image for editing, encoded as a base64 string.' })
  imageBase64: string;

  @Field({ description: 'The MIME type of the base image (e.g., "image/png").' })
  mimeType: string;

  @Field()
  prompt: string;
}

@InputType({ description: 'A part of a multi-modal message in a chat history.' })
class PartInput {
  @Field(() => String)
  text: string;
}

@InputType({ description: 'A single message in a chat conversation history.' })
class ContentInput {
  @Field(() => String)
  role: string;

  @Field(() => [PartInput])
  parts: PartInput[];
}

// =============================================================================
// GenAI Resolver
// =============================================================================

@Resolver()
export class GenaiResolver {
  private readonly logger = new Logger(GenaiResolver.name);

  constructor(private readonly genaiService: GenaiService) {}

  @Query(() => String, {
    name: 'genaiHealthCheck',
    description: 'Checks the health of the GenAI GraphQL subgraph.',
  })
  healthCheck(): string {
    this.logger.log('GenAI health check performed.');
    return 'GenAI Subgraph is running!';
  }

  @Mutation(() => String, {
    description: 'Generates a short story for a custom card design.',
  })
  async generateCardStory(@Args('prompt') prompt: string): Promise<string> {
    return this.genaiService.generateCardStory(prompt);
  }

  @Mutation(() => AIAdvisorResponse, {
    description: 'Sends a message to the AI Financial Advisor and gets a response. This is a stateless operation.',
  })
  async askAIAdvisor(
    @Args('history', { type: () => [ContentInput] }) history: ContentInput[],
    @Args('message') message: string,
  ): Promise<AIAdvisorResponse> {
    // 1. Call the service to get the AI's response.
    const newAiMessages = await this.genaiService.askAIAdvisor({
      history: history as Content[],
      message: message,
    });

    // 2. Construct the full message list to return to the client.
    const userMessage: AIAdvisorMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      parts: [{ text: message }],
      timestamp: new Date(),
    };

    const mappedHistory: AIAdvisorMessage[] = history.map((msg, index) => ({
      id: `hist_${index}_${Date.now()}`,
      role: msg.role,
      parts: msg.parts,
      timestamp: new Date(), // Timestamp is regenerated as it's not preserved client-side.
    }));

    const allMessages = [...mappedHistory, userMessage, ...newAiMessages];

    return { messages: allMessages };
  }

  @Mutation(() => VideoGenerationResult, {
    description: 'Generates a video ad based on a prompt.',
  })
  async generateAdVideo(
    @Args('input') input: GenerateAdVideoInput,
  ): Promise<VideoGenerationResult> {
    return this.genaiService.generateAdVideo(input);
  }

  @Mutation(() => VideoGenerationResult, {
    description: 'Checks the status of a video generation operation.',
  })
  async checkVideoGenerationStatus(
    @Args('operationId') operationId: string,
  ): Promise<VideoGenerationResult> {
    this.logger.log(`Checking status for ${operationId}`);
    // The `generateAdVideo` service method already polls and waits for the final result.
    // This mutation is provided for schema completeness and returns a mock success state.
    return {
      operationId,
      status: 'done',
      videoUrl: 'https://storage.googleapis.com/demobank-assets/ai-ads/mock-video.mp4',
    };
  }

  @Mutation(() => String, {
    description: 'Generates a custom image for a bank card using AI image editing. Returns a public URL to the image.',
  })
  async generateCardImage(
    @Args('input') input: GenerateCardImageInput,
  ): Promise<string> {
    return this.genaiService.generateCardImage(input);
  }
}
