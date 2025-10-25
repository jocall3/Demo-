/**
 * @file services/transactions-service/src/main.ts
 * @description Main entry point for the Transactions microservice.
 *
 * ARCHITECTURAL REFACTOR:
 * This file has been completely overhauled to align with new architectural directives:
 * 1.  **Observability First**: OpenTelemetry SDK is initialized before any other code to ensure
 *     comprehensive tracing and metrics collection from the very start of the process.
 * 2.  **Structured Logging**: A Pino-based structured logger is implemented, automatically enriching
 *     logs with OpenTelemetry trace and span IDs for correlated logging.
 * 3.  **Hexagonal Architecture Bootstrapping**: This file acts as the primary infrastructure adapter, responsible
 *     for bootstrapping the NestJS application, connecting to external systems (Kafka, Temporal), and starting
 *     the server.
 * 4.  **Durable Sagas**: It explicitly starts a Temporal Worker in the background. This worker is responsible for
 *     executing the durable, long-running payment sagas, offloading complex state management from the service's
 *     direct logic.
 * 5.  **Event-Driven Communication**: It connects to Kafka as a microservice to listen for relevant domain events,
 *     adhering to the CQRS and Event Sourcing patterns for updating its read models.
 */

// --- 1. Observability Setup (MUST be imported and executed before ANY other module) ---
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from '@opentelemetry/api';

// --- 2. NestJS & Workflow Engine Imports (after OTel setup) ---
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, ClientKafka } from '@nestjs/microservices';
import pino from 'pino';
import { NativeConnection, Worker } from '@temporalio/worker';
import { TransactionService } from './transaction/transaction.service';
import * as activities from './temporal/activities/payment.activities';
import { KAFKA_PRODUCER_CLIENT } from './event-bus/event-bus.module';

// --- 3. OpenTelemetry Initialization ---
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const SERVICE_NAME = 'transactions-service';
const PROMETHEUS_PORT = parseInt(process.env.PROMETHEUS_PORT || '9468', 10);

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

// --- 4. Structured Logging with OpenTelemetry Context ---
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

// --- 5. Temporal Worker Bootstrap ---
/**
 * Initializes and runs the Temporal Worker in the background.
 * The worker connects to the Temporal cluster and executes workflows and activities
 * defined in this service, such as the 'paymentWorkflow' saga.
 * @param app - The NestJS application context to resolve DI for activities.
 * @param logger - The structured logger for worker-specific logs.
 */
async function runTemporalWorker(
  app: INestApplicationContext,
  logger: StructuredLogger,
) {
  logger.log('Initializing Temporal Worker...');

  const configService = app.get(ConfigService);
  const transactionService = app.get(TransactionService);

  const temporalAddress = configService.get<string>('TEMPORAL_ADDRESS', 'localhost:7233');
  const taskQueue = configService.get<string>('TEMPORAL_TASK_QUEUE', 'transactions-queue');

  const connection = await NativeConnection.create({ address: temporalAddress });

  const worker = await Worker.create({
    connection,
    namespace: configService.get<string>('TEMPORAL_NAMESPACE', 'default'),
    taskQueue,
    workflowsPath: require.resolve('./temporal/workflows/payment.workflow'),
    activities: activities.createActivities(transactionService),
  });

  logger.log(`Temporal Worker started. Listening on task queue: "${taskQueue}".`);
  await worker.run();
  logger.log('Temporal Worker has shut down.');
}

// --- 6. Application Bootstrap ---
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Run the Temporal Worker in the background; do not `await` its completion.
  runTemporalWorker(app, logger).catch((err) => {
    logger.error('Temporal Worker crashed', err.stack, 'Bootstrap');
    process.exit(1);
  });

  // Connect Kafka Microservice for event-driven communication (CQRS read model updates).
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: configService.get<string>('KAFKA_CLIENT_ID', SERVICE_NAME),
        brokers: configService.getOrThrow<string>('KAFKA_BROKERS').split(','),
      },
      consumer: {
        groupId: configService.getOrThrow<string>('KAFKA_GROUP_ID'),
      },
    },
  });

  await app.startAllMicroservices();
  logger.log('Kafka microservice connected and listening for events.');

  // Configure and start the HTTP server for the GraphQL API.
  app.enableCors();
  logger.log('CORS has been enabled.');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  logger.log('Global ValidationPipe configured.');

  const port = configService.get<number>('PORT') || 4003;

  await app.listen(port);

  logger.log(`🚀 Transactions subgraph is running on: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${PROMETHEUS_PORT}`);
}

bootstrap().catch((err) => {
  console.error('Application bootstrap failed', err.stack);
  process.exit(1);
});
