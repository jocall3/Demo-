import { Args, Field, InputType, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { GenaiService } from './genai.service';
import { Content } from '@google/generative-ai';

// =============================================================================
// GraphQL Object Types (Responses)
// =============================================================================

@ObjectType({
  description: 'A generic response containing a single text field.',
})
class TextResponse {
  @Field(() => String, { description: 'The generated text content.' })
  text: string;
}

@ObjectType({
  description: 'Represents a part of a multi-modal response from the AI.',
})
class PartResponse {
  @Field(() => String, {
    nullable: true,
    description: 'The text content of the part.',
  })
  text?: string;
  // In a full implementation, other Part types like functionCall would be added here.
}

@ObjectType({
  description: 'The response from a conversational chat mutation.',
})
class ChatResponse {
  @Field(() => [PartResponse], {
    description: 'The array of parts constituting the AI\'s response.',
  })
  parts: PartResponse[];
}

@ObjectType({ description: 'The response for an image generation or editing task.' })
class ImageResponse {
  @Field(() => String, { description: 'The generated image as a base64 encoded string.' })
  imageBase64: string;

  @Field(() => String, { description: 'The MIME type of the generated image (e.g., \'image/png\').' })
  mimeType: string;
}

@ObjectType({ description: 'The response for a video generation task.' })
class VideoResponse {
  @Field(() => String, { description: 'The URI of the generated video file.' })
  videoUri: string;
}

// =============================================================================
// GraphQL Input Types (Arguments)
// =============================================================================

@InputType({ description: 'A part of a multi-modal message in a chat history.' })
class PartInput {
  @Field(() => String, { description: 'The text content of the part.' })
  text: string;
}

@InputType({ description: 'A single message in a chat conversation history.' })
class ContentInput {
  @Field(() => String, { description: 'The role of the author of this message (e.g., \'user\' or \'model\').' })
  role: string;

  @Field(() => [PartInput], { description: 'The parts that make up the message content.' })
  parts: PartInput[];
}

// =============================================================================
// GenAI Resolver
// =============================================================================

@Resolver()
export class GenaiResolver {
  constructor(private readonly genaiService: GenaiService) {}

  @Query(() => String, {
    name: 'genaiHealthCheck',
    description: 'Checks the health of the GenAI GraphQL service.',
  })
  healthCheck(): string {
    return 'GenAI GraphQL service is running!';
  }

  @Mutation(() => TextResponse, {
    description: 'Generates a simple text response from a given prompt.',
  })
  async generateText(
    @Args('prompt', { type: () => String }) prompt: string,
  ): Promise<TextResponse> {
    const result = await this.genaiService.generateText({ prompt });
    return { text: result };
  }

  @Mutation(() => ChatResponse, {
    description: 'Continues a conversational chat with the AI model.',
  })
  async continueChat(
    @Args('history', { type: () => [ContentInput] })
    history: ContentInput[],
    @Args('newMessage', { type: () => String })
    newMessage: string,
  ): Promise<ChatResponse> {
    const resultParts = await this.genaiService.continueChat({
      history: history as Content[], // Cast to the type expected by the service layer
      newMessage,
    });
    return { parts: resultParts };
  }

  @Mutation(() => ImageResponse, { description: 'Generates a new image from a text prompt.' })
  async generateImage(
    @Args('prompt', { type: () => String }) prompt: string,
  ): Promise<ImageResponse> {
    return this.genaiService.generateImage({ prompt });
  }

  @Mutation(() => ImageResponse, { description: 'Edits an existing image based on a text prompt.' })
  async editImage(
    @Args('prompt', { type: () => String }) prompt: string,
    @Args('imageBase64', { type: () => String }) imageBase64: string,
    @Args('mimeType', { type: () => String }) mimeType: string,
  ): Promise<ImageResponse> {
    return this.genaiService.editImage({ prompt, imageBase64, mimeType });
  }

  @Mutation(() => VideoResponse, {
    description: 'Initiates a long-running video generation task from a text prompt.',
  })
  async generateVideo(
    @Args('prompt', { type: () => String }) prompt: string,
  ): Promise<VideoResponse> {
    // Assuming default settings are handled by the service for this simplified mutation
    return this.genaiService.generateVideo({ prompt, settings: {} });
  }
}
