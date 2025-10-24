import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GenaiService } from './genai.service';
import { GenerateTextDto } from './dto/generate-text.dto';
import { ChatCompletionDto } from './dto/chat-completion.dto';
import { GenerateVideoDto } from './dto/generate-video.dto';
import { GenerateImageDto } from './dto/generate-image.dto';
import { EditImageDto } from './dto/edit-image.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('GenAI')
@Controller('genai')
export class GenaiController {
  constructor(private readonly genaiService: GenaiService) {}

  @Post('text')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate text content from a prompt',
    description:
      'Provides a simple text-in, text-out generation using a specified model. Used for simple Q&A, summarization, and other non-chat text generation tasks.',
  })
  @ApiBody({ type: GenerateTextDto })
  @ApiResponse({
    status: 200,
    description: 'Text generation successful.',
    type: String,
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async generateText(@Body() generateTextDto: GenerateTextDto) {
    return this.genaiService.generateText(generateTextDto);
  }

  @Post('chat')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Continue a conversation with the AI model',
    description:
      "Handles multi-turn conversations. The client sends the entire chat history and the new message, and the BFF returns the AI's response, including any tool calls.",
  })
  @ApiBody({ type: ChatCompletionDto })
  @ApiResponse({
    status: 200,
    description: 'Chat message processed successfully.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async chat(@Body() chatCompletionDto: ChatCompletionDto) {
    return this.genaiService.chat(chatCompletionDto);
  }

  @Post('videos')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK) // Using OK because the service will handle polling and return the final result
  @ApiOperation({
    summary: 'Generate a video from a prompt',
    description:
      'Initiates a video generation task. This is a long-running endpoint. The BFF handles the asynchronous polling with the Google GenAI API and returns the final video data upon completion.',
  })
  @ApiBody({ type: GenerateVideoDto })
  @ApiResponse({
    status: 200,
    description: 'Video generation successful. Returns video data.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async generateVideo(@Body() generateVideoDto: GenerateVideoDto) {
    return this.genaiService.generateVideo(generateVideoDto);
  }

  @Post('images/generate')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate an image from a prompt',
    description: 'Creates a new image based on a text prompt.',
  })
  @ApiBody({ type: GenerateImageDto })
  @ApiResponse({
    status: 200,
    description: 'Image generation successful. Returns image data.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async generateImage(@Body() generateImageDto: GenerateImageDto) {
    return this.genaiService.generateImage(generateImageDto);
  }

  @Post('images/edit')
  @UsePipes(new ValidationPipe({ transform: true }))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Edit an image using a prompt',
    description:
      'Takes a base image and a text prompt to generate an edited version of the image.',
  })
  @ApiBody({ type: EditImageDto })
  @ApiResponse({
    status: 200,
    description: 'Image editing successful. Returns edited image data.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  async editImage(@Body() editImageDto: EditImageDto) {
    return this.genaiService.editImage(editImageDto);
  }
}
