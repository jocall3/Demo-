import { Module } from '@nestjs/common';
import { GenaiService } from './genai.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { GenaiResolver } from './genai.resolver';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000, // Increased timeout for potentially long-running GenAI APIs
      maxRedirects: 5,
    }),
  ],
  providers: [GenaiResolver, GenaiService],
  exports: [GenaiService],
})
export class GenaiModule {}
