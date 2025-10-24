import { Module } from '@nestjs/common';
import { GenaiController } from './genai.controller';
import { GenaiService } from './genai.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [GenaiController],
  providers: [GenaiService],
  exports: [GenaiService],
})
export class GenaiModule {}
