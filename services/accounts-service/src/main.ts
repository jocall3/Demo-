// --- 1. Observability Setup (MUST be imported and executed before ANY other module) ---
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from '@opentelemetry/api';

const SERVICE_NAME = 'accounts-service';

// For troubleshooting OpenTelemetry, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9466', 10),
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
import { Transport } from '@nestjs/microservices';
import pino from 'pino';

// --- 3. Structured Logging with OpenTelemetry Context ---
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
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Connect the Kafka microservice for consuming events (e.g., from user-service)
  // This is essential for the CQRS/Event Sourcing pattern.
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: configService.get<string>('KAFKA_CLIENT_ID', SERVICE_NAME),
        brokers: configService.getOrThrow<string>('KAFKA_BROKERS').split(','),
      },
      consumer: {
        groupId: configService.getOrThrow<string>('KAFKA_CONSUMER_GROUP_ID'),
      },
    },
  });

  await app.startAllMicroservices();
  logger.log('Kafka microservice consumers started and listening for events.');

  app.enableCors();
  logger.log('CORS has been enabled for all origins.');

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
  logger.log('Global ValidationPipe configured for GraphQL inputs.');

  const port = configService.get<number>('PORT') || 4002;
  const prometheusPort = process.env.PROMETHEUS_PORT || '9466';

  await app.listen(port);

  logger.log(`Accounts subgraph (GraphQL API) is running on: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${prometheusPort}`);
}

bootstrap();
