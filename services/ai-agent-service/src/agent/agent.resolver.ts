import { Args, Mutation, Resolver, InputType, Field, Int, ObjectType, Query } from '@nestjs/graphql';
import { UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { AgentService } from './agent.service';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { Content, Part } from '@google/generative-ai';
import { Stream } from 'stream';

// --- GraphQL Input Types ---
// These types define the shape of data for this subgraph's GraphQL mutations.

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

@InputType('PartInput')
class ChatPartInput {
  @Field(() => String)
  text: string;
}

@InputType('ContentInput')
class ChatContentInput {
  @Field(() => String)
  role: string;

  @Field(() => [ChatPartInput])
  parts: ChatPartInput[];
}


// --- GraphQL Object Types ---
// These types define the shape of data returned by this subgraph's GraphQL queries/mutations.

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
class VideoOperationStatus {
  @Field()
  operationId: string; // This will be the Temporal Workflow ID.

  @Field()
  status: string; // e.g., 'STARTED', 'RUNNING', 'COMPLETED', 'FAILED'.

  @Field({ nullable: true })
  videoUrl?: string; // Only available if status is 'COMPLETED'.

  @Field({ nullable: true })
  errorMessage?: string; // Only available if status is 'FAILED'.
}

/**
 * AgentResolver
 * 
 * This resolver provides the GraphQL API for the AI Agent Service.
 * As part of a federated subgraph, it exposes mutations for all generative AI
 * capabilities, including text, chat, video, and image generation.
 *
 * It delegates complex, long-running tasks like video generation to Temporal workflows,
 * returning a workflow ID for asynchronous tracking. Simpler, synchronous tasks
 * directly interact with the underlying AI models via the AgentService.
 */
@Resolver('AIAgent')
@UsePipes(new ValidationPipe({ transform: true }))
export class AgentResolver {
  private readonly logger = new Logger(AgentResolver.name);

  constructor(private readonly agentService: AgentService) {}

  @Mutation(() => String, {
    description: 'Generates a short story for a custom card design.',
  })
  async generateCardStory(@Args('prompt') prompt: string): Promise<string> {
    return this.agentService.generateText({ prompt });
  }

  @Mutation(() => AIAdvisorResponse, {
    description: 'Sends a message to the AI Financial Advisor and gets a response (stateless per request).',
  })
  async askAIAdvisor(
    // The client (BFF) is responsible for managing and sending the full history.
    @Args('history', { type: () => [ChatContentInput], defaultValue: [] }) history: ChatContentInput[],
    @Args('message') message: string,
    @Args('conversationId', { type: () => String, nullable: true }) conversationId?: string,
  ): Promise<AIAdvisorResponse> {
    this.logger.log(`Received askAIAdvisor for conversation ${conversationId || 'new'}`);
    
    // Map ChatContentInput[] to Content[] for the AgentService
    const formattedHistory: Content[] = history.map(chatContent => ({
        role: chatContent.role,
        parts: chatContent.parts.map(p => ({ text: p.text })) as Part[],
    }));

    const responseParts: Part[] = await this.agentService.continueChat({
      history: formattedHistory,
      newMessage: message,
    });

    // Re-construct the full message list including the user's message and the new AI response for GraphQL output.
    const userMessage: AIAdvisorMessage = {
      id: `${conversationId || 'new'}-user-${Date.now()}`,
      role: 'user',
      parts: [{ text: message }],
      timestamp: new Date(),
    };

    const newAIResponse: AIAdvisorMessage = {
      id: `${conversationId || 'new'}-model-${Date.now()}`,
      role: 'model',
      parts: responseParts.map(p => ({ text: (p as any).text })), // Assuming only text parts for now, match AIAdvisorMessagePart
      timestamp: new Date(),
    };
    
    // Map existing history to AIAdvisorMessage for the response
    const mappedHistoryForResponse: AIAdvisorMessage[] = history.map((chatContent, i) => ({
        id: `${conversationId || 'new'}-hist-${i}`,
        role: chatContent.role,
        parts: chatContent.parts.map(p => ({ text: p.text })),
        timestamp: new Date(), // Regenerate timestamp if not provided in history.
    }));

    return { messages: [...mappedHistoryForResponse, userMessage, newAIResponse] };
  }

  @Mutation(() => VideoOperationStatus, {
    description: 'Initiates a long-running workflow to generate a video ad and returns an operation ID for tracking.',
  })
  async generateAdVideo(
    @Args('input') input: GenerateAdVideoInput,
    // Assume userId comes from the GraphQL context via authentication in a real scenario.
    // For now, use a placeholder.
    @Args('userId', { type: () => String, nullable: true, defaultValue: 'mock-user-id' }) userId: string,
  ): Promise<VideoOperationStatus> {
    this.logger.log(`Initiating generateAdVideo workflow for user ${userId} with prompt: "${input.prompt.substring(0, 50)}..."`);
    const { workflowId, status } = await this.agentService.startVideoGenerationWorkflow({ ...input, userId });
    return { operationId: workflowId, status };
  }

  @Query(() => VideoOperationStatus, {
    name: 'videoGenerationStatus',
    description: 'Checks the current status of a video generation operation by its ID.',
  })
  async checkVideoGenerationStatus(
    @Args('operationId') operationId: string,
  ): Promise<VideoOperationStatus> {
    this.logger.log(`Checking status for video operation: ${operationId}`);
    const statusResult = await this.agentService.queryVideoGenerationWorkflowStatus(operationId);
    return statusResult;
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

    return `data:${result.mimeType};base64,${result.imageBase64}`;
  }
}
