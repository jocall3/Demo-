// --- 1. Observability Setup (MUST be imported and executed before ANY other module) ---
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from '@opentelemetry/api';

// For troubleshooting OpenTelemetry, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const otelSDK = new NodeSDK({
  // The service name is a required attribute for all telemetry data.
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'bff-service',
  }),
  // OTLPTraceExporter will send traces to an OTel Collector.
  // The endpoint is configurable via the OTEL_EXPORTER_OTLP_ENDPOINT env var.
  traceExporter: new OTLPTraceExporter(),
  // PrometheusExporter exposes a /metrics endpoint for Prometheus to scrape.
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
  }),
  // Auto-instrument popular libraries (Express, HTTP, Axios, gRPC, KafkaJS, etc.)
  instrumentations: [getNodeAutoInstrumentations()],
});

// Gracefully shut down the SDK on process exit to flush telemetry
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully.'))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK.', error))
    .finally(() => process.exit(0));
});

// Start the OpenTelemetry SDK
otelSDK.start();

// --- 2. NestJS Application Imports (after OTel setup) ---
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

// --- 3. Structured Logging with OpenTelemetry Context ---
/**
 * A custom logger implementation that uses Pino for structured JSON logging
 * and automatically injects OpenTelemetry trace and span IDs into log records.
 */
class StructuredLogger implements LoggerService {
  private readonly pino: pino.Logger;
  private readonly serviceName = 'bff-service';

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
asnyc function bootstrap() {
  // Use the custom structured logger for the entire application.
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  logger.log(`CORS enabled for origin: ${frontendUrl}`);

  // Global pipes for validation and transformation
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

  // Get port from environment variables, with a fallback
  const port = configService.get<number>('PORT') || 3001;

  await app.listen(port);

  const appUrl = await app.getUrl();
  logger.log(`BFF is running on: ${appUrl}`);
  logger.log(
    `Prometheus metrics available on port ${process.env.PROMETHEUS_PORT || '9464'}`,
  );
}

bootstrap();
