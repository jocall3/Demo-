import { Module } from '@nestjs/common';
import { GenaiService } from './genai.service';
import { ConfigModule } from '@nestjs/config';
import { GenaiResolver } from './genai.resolver';

@Module({
  imports: [ConfigModule],
  providers: [GenaiResolver, GenaiService],
  exports: [GenaiService],
})
export class GenaiModule {}
