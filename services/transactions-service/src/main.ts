// --- 1. Observability Setup (MUST be imported and executed before ANY other module) ---
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from '@opentelemetry/api';

// --- 2. NestJS & Workflow Engine Imports (after OTel setup) ---
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import pino from 'pino';
import { NativeConnection, Worker } from '@temporalio/worker';
import { TransactionService } from './transaction/transaction.service';
import * as activities from './transaction/activities';

// --- 3. OpenTelemetry Initialization ---
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const SERVICE_NAME = 'transactions-service';

const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.METRICS_PROMETHEUS_PORT || '9464', 10),
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

  log(message: any, context?: string) { this.pino.info({ context }, message); }
  error(message: any, trace?: string, context?: string) { this.pino.error({ context, stack: trace }, message); }
  warn(message: any, context?: string) { this.pino.warn({ context }, message); }
  debug?(message: any, context?: string) { this.pino.debug({ context }, message); }
  verbose?(message: any, context?: string) { this.pino.trace({ context }, message); }
}

// --- 5. Application Bootstrap ---
async function bootstrap() {
  // Create the main NestJS application instance.
  // This instance will be used for both the GraphQL server and to provide
  // dependency injection for the Temporal Worker's activities.
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  /**
   * Initializes and runs the Temporal Worker.
   * The worker connects to the Temporal cluster and starts polling a specific task queue
   * for workflows and activities to execute. This runs in the background.
   */
  const runTemporalWorker = async () => {
    logger.log('Initializing Temporal Worker...');

    // Resolve NestJS services to be used as activities
    const transactionService = app.get(TransactionService);

    const temporalAddress = configService.get<string>('TEMPORAL_ADDRESS', 'localhost:7233');
    const taskQueue = configService.get<string>('TEMPORAL_TRANSACTIONS_TASK_QUEUE', 'transactions-task-queue');

    const connection = await NativeConnection.create({ address: temporalAddress });

    const worker = await Worker.create({
      connection,
      namespace: configService.get<string>('TEMPORAL_NAMESPACE', 'default'),
      taskQueue,
      workflowsPath: require.resolve('./workflows'), // Assumes workflows are in ./src/workflows/index.ts
      activities: activities.createActivities(transactionService), // Create activities with DI
    });

    logger.log(`Starting Temporal Worker for task queue: "${taskQueue}"...`);
    await worker.run();
    logger.log('Temporal Worker has shut down.');
  };

  // Run the worker in the background; do not await its completion.
  runTemporalWorker().catch((err) => {
    logger.error('Temporal Worker failed to run', err.stack, 'Bootstrap');
    process.exit(1);
  });

  // Connect Kafka Microservice for event-driven communication
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

  // Enable CORS for development (e.g., Apollo Studio)
  app.enableCors();
  logger.log('CORS has been enabled.');

  // Apply global validation pipes
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
  
  const prometheusPort = process.env.METRICS_PROMETHEUS_PORT || '9464';
  logger.log(`🚀 Transactions subgraph is running on: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${prometheusPort}`);
}

bootstrap();
