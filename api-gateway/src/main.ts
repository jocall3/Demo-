// --- 1. Observability Setup (MUST be imported and executed before ANY other module) ---
import './opentelemetry';

// --- 2. NestJS Application Imports (after OTel setup) ---
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace, context } from '@opentelemetry/api';
import pino from 'pino';

// --- 3. Structured Logging with OpenTelemetry Context ---
/**
 * A custom logger implementation that uses Pino for structured JSON logging
 * and automatically injects OpenTelemetry trace and span IDs into log records.
 */
class StructuredLogger implements LoggerService {
  private readonly pino: pino.Logger;
  private readonly serviceName = 'api-gateway';

  constructor() {
    this.pino = pino({
      level: process.env.LOG_LEVEL || 'info',
      // Format logs as JSON and enrich with OTel context and service name.
      formatters: {
        log: (object) => {
          const span = trace.getSpan(context.active());
          const logObject: { [key: string]: any } = {
            ...object,
            service: this.serviceName,
          };
          if (span) {
            const spanContext = span.spanContext();
            logObject.trace_id = spanContext.traceId;
            logObject.span_id = spanContext.spanId;
          }
          return logObject;
        },
      },
      // Use pino-pretty for more readable logs in development.
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                messageFormat: '{service} - {msg}',
              },
            }
          : undefined,
    });
  }

  log(message: any, context?: string) {
    this.pino.info({ context }, message);
  }
  error(message: any, trace?: string, context?: string) {
    this.pino.error({ context, stack: trace }, message);
  }
  warn(message: any, context?: string) {
    this.pino.warn({ context }, message);
  }
  debug?(message: any, context?: string) {
    this.pino.debug({ context }, message);
  }
  verbose?(message: any, context?: string) {
    this.pino.trace({ context }, message);
  }
}

// --- 4. Application Bootstrap ---
async function bootstrap() {
  // Use the custom structured logger for the entire application.
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Enable CORS, getting the allowed origin from the configuration service.
  const corsOrigin = configService.get<string>('cors.origin');
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  logger.log(`CORS enabled for origin: ${corsOrigin}`);

  // Apply global pipes for validation and transformation of DTOs/Inputs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted values are provided
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  logger.log('Global ValidationPipe configured.');

  // Get port from environment variables, with a fallback.
  const port = configService.get<number>('port') || 4000;

  await app.listen(port);

  logger.log(`🚀 API Gateway is running on: http://localhost:${port}/graphql`);
}

bootstrap();
