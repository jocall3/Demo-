/**
 * @file experience-onboarding-api/src/main.ts
 * @description The entry point for the Experience Onboarding API microservice.
 *
 * ARCHITECTURAL OVERVIEW:
 * This service is a dedicated 'Experience Layer' API as per the 'Implement Multi-Tiered API Architecture'
 * directive. Its purpose is to serve the specific needs of the user onboarding frontend experience.
 * It acts as a client to the federated Supergraph Gateway, orchestrating data fetching and shaping
 * payloads tailored for the onboarding UI/UX flow.
 *
 * This file sets up:
 * 1.  OpenTelemetry for distributed tracing and metrics, initialized before any other module.
 * 2.  A structured JSON logger (Pino) that is integrated with OpenTelemetry for log correlation.
 * 3.  The main NestJS application bootstrap sequence, including CORS, global validation pipes,
 *     and graceful shutdown hooks.
 */

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

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'experience-onboarding-api';
const PROMETHEUS_PORT = parseInt(process.env.PROMETHEUS_PORT || '9481', 10);

const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PrometheusExporter({
    port: PROMETHEUS_PORT,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Gracefully shut down the SDK on process exit to flush telemetry data.
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log(`OpenTelemetry SDK for ${SERVICE_NAME} shut down successfully.`))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK.', error))
    .finally(() => process.exit(0));
});

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
 * and automatically injects OpenTelemetry trace and span IDs into log records for correlation.
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

// --- 4. Application Bootstrap ---
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  logger.log(`CORS enabled for origin: ${corsOrigin}`);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  logger.log('Global ValidationPipe configured.');

  const port = configService.get<number>('PORT') || 5001;

  await app.listen(port);

  logger.log(`🚀 Experience Onboarding API is running on: http://localhost:${port}`);
  logger.log(`Prometheus metrics available on port ${PROMETHEUS_PORT}`);
}

bootstrap();
