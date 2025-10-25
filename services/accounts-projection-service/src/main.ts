// --- 1. Observability Setup (MUST be imported and executed before ANY other module) ---
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from '@opentelemetry/api';

// --- 2. NestJS Application Imports (after OTel setup) ---
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; // Assuming an AppModule exists for this service
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import pino from 'pino';

// --- 3. OpenTelemetry and Logging Configuration ---
const SERVICE_NAME = 'accounts-projection-service';
const PROMETHEUS_PORT = parseInt(process.env.PROMETHEUS_PORT || '9470', 10);

// For troubleshooting OpenTelemetry, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

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

process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log(`OpenTelemetry SDK for ${SERVICE_NAME} shut down successfully.`))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK.', error))
    .finally(() => process.exit(0));
});

otelSDK.start();

/**
 * A custom logger implementation that uses Pino for structured JSON logging
 * and automatically injects OpenTelemetry trace and span IDs into log records.
 */
class StructuredLogger implements LoggerService {
  private readonly pino: pino.Logger;
  private readonly serviceName = SERVICE_NAME;

  constructor() {
    this.pino = pino({
      level: process.env.LOG_LEVEL || 'info',
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
  // Create a NestJS microservice application instance.
  // This type of application doesn't listen on HTTP by default but can be configured to do so.
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Configure and connect the Kafka microservice transport.
  // This enables the application to act as a consumer of events from the message bus.
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: configService.get<string>('KAFKA_CLIENT_ID', SERVICE_NAME),
        brokers: configService.getOrThrow<string>('KAFKA_BROKERS').split(','),
      },
      consumer: {
        // A unique consumer group ID for this projection service.
        groupId: configService.getOrThrow<string>('KAFKA_GROUP_ID', 'accounts-projection-consumer'),
        allowAutoTopicCreation: true, // Suitable for dev, should be false in prod.
      },
    },
  });

  // Start all registered microservice transports.
  await app.startAllMicroservices();
  logger.log(
    `Kafka consumer connected and listening for events on group ID: ${configService.get<string>(
      'KAFKA_GROUP_ID', 'accounts-projection-consumer'
    )}`,
  );

  // Get port for health checks from environment variables, with a fallback.
  const port = configService.get<number>('PORT') || 4012;

  // Start an HTTP listener for health checks and Prometheus scraping.
  // A pure event consumer might not expose an API, but this is good practice for observability.
  await app.listen(port);

  logger.log(`🚀 Accounts Projection Service is running.`);
  logger.log(`Health check endpoint available at: http://localhost:${port}`);
  logger.log(`Prometheus metrics available on port ${PROMETHEUS_PORT}`);
}

bootstrap();
