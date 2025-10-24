import './opentelemetry'; // Must be imported first

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino-logger
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3001;

  // Enable CORS
  const corsOrigin = configService.get<string>('cors.origin');
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 API Gateway is running on: http://localhost:${port}/graphql`);
}
bootstrap();
