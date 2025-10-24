import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from '@opentelemetry/api';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

// --- 1. Observability Setup (MUST be initialized before any other module) ---

// For troubleshooting OpenTelemetry, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'api-gateway';

const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PrometheusExporter({
    port: 9464, // Port from original opentelemetry.ts for this service
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Gracefully shut down the SDK on process exit to flush telemetry data.
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully.'))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK.', error))
    .finally(() => process.exit(0));
});

otelSDK.start();

// --- 2. Structured Logging with OpenTelemetry Context ---

/**
 * A custom logger that uses Pino for structured JSON logging and automatically
 * injects OpenTelemetry trace and span IDs into log records for correlation.
 */
class StructuredLogger implements LoggerService {
  private readonly pino: pino.Logger;

  constructor() {
    this.pino = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        log: (object) => {
          const span = trace.getSpan(context.active());
          const logObject: { [key: string]: any } = {
            ...object,
            service: SERVICE_NAME,
          };
          if (span) {
            const spanContext = span.spanContext();
            logObject.trace_id = spanContext.traceId;
            logObject.span_id = spanContext.spanId;
          }
          return logObject;
        },
      },
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

// --- 3. Application Bootstrap ---

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
    bufferLogs: true, // Buffer logs until the custom logger is attached
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('port');
  const corsOrigin = configService.get<string>('cors.origin');

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  logger.log(`CORS enabled for origin: ${corsOrigin}`);

  // Apply global validation pipes to all incoming requests.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators.
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted values are provided.
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes.
    }),
  );
  logger.log('Global ValidationPipe configured.');

  // Enable hooks for graceful shutdown (e.g., for database connections, etc.)
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`🚀 API Gateway is running on: http://localhost:${port}/graphql`);
}

bootstrap();
