import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GeminiService } from './gemini.service';
import { GeminiResolver } from './gemini.resolver';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 15000, // Increased timeout for potentially long-running GenAI APIs
      maxRedirects: 5,
    }),
  ],
  providers: [GeminiResolver, GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
