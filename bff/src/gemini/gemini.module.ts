import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { GeminiResolver } from './gemini.resolver';

@Module({
  imports: [ConfigModule],
  providers: [GeminiResolver, GeminiService],
  exports: [GeminiService],
})
export class GeminiModule {}
