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

const SERVICE_NAME = 'ai-agent-service';

const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9467', 10),
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

// --- 2. Application Imports (after OTel setup) ---
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import pino from 'pino';
import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './temporal/activities';

// --- 3. Structured Logging with OpenTelemetry Context ---
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

  log(message: any, context?: string) { this.pino.info({ context }, message); }
  error(message: any, trace?: string, context?: string) { this.pino.error({ context, stack: trace }, message); }
  warn(message: any, context?: string) { this.pino.warn({ context }, message); }
  debug?(message: any, context?: string) { this.pino.debug({ context }, message); }
  verbose?(message: any, context?: string) { this.pino.trace({ context }, message); }
}

// --- 4. Temporal Worker Bootstrap ---
/**
 * Initializes and runs the Temporal Worker.
 * The Worker connects to the Temporal cluster and executes Workflows and Activities
 * defined in this service, such as the 'Quantum Weaver' business plan analysis.
 */
async function runTemporalWorker(logger: StructuredLogger) {
  const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const taskQueue = 'ai-agent-workflows';

  logger.log(`Connecting Temporal Worker to ${temporalAddress}...`);

  const connection = await NativeConnection.create({
    address: temporalAddress,
  });

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue,
    // Workflows are registered via file path to enable hot-reloading in development
    workflowsPath: require.resolve('./temporal/workflows'),
    // Activities are imported and registered directly
    activities,
  });

  logger.log(`Temporal Worker started. Listening on task queue: "${taskQueue}".`);
  await worker.run();
  logger.log('Temporal Worker has shut down.');
}

// --- 5. Application Bootstrap ---
async function bootstrap() {
  const logger = new StructuredLogger();

  // Start the Temporal Worker in the background. It will begin polling for tasks.
  runTemporalWorker(logger).catch((err) => {
    logger.error('Temporal Worker crashed', err.stack);
    process.exit(1);
  });

  // Create and configure the NestJS application.
  // This serves the GraphQL API for synchronous operations (e.g., starting a workflow)
  // and may still handle simpler, non-workflow-based events from Kafka.
  const app = await NestFactory.create(AppModule, { logger });
  const configService = app.get(ConfigService);

  // Connect to Kafka for any remaining event-driven choreography patterns.
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: configService.getOrThrow<string>('KAFKA_BROKERS').split(','),
        clientId: SERVICE_NAME,
      },
      consumer: {
        groupId: configService.getOrThrow<string>('KAFKA_GROUP_ID'),
      },
    },
  });

  await app.startAllMicroservices();
  logger.log('Kafka microservice consumers started.');

  app.enableCors();
  logger.log('CORS has been enabled.');

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  logger.log('Global ValidationPipe configured.');

  const port = configService.get<number>('PORT') || 4004;
  const prometheusPort = process.env.PROMETHEUS_PORT || '9467';

  await app.listen(port);

  logger.log(`🚀 AI Agent Service (GraphQL API) is running on: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${prometheusPort}`);
}

bootstrap();
