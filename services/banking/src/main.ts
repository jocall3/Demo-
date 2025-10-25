// --- 1. Observability Setup (MUST be imported and executed before ANY other module) ---
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from '@opentelemetry/api';

// --- 2. Application Imports (after OTel setup) ---
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import pino from 'pino';
import { NativeConnection, Worker } from '@temporalio/worker';

// These imports are assumed to exist after full refactoring according to new architecture.
// import { BankingService } from './banking.service';
// import * as activities from './temporal/activities';

// --- 3. OpenTelemetry and Logging Configuration ---
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const SERVICE_NAME = 'banking-service';
const PROMETHEUS_PORT = parseInt(process.env.PROMETHEUS_PORT || '9470', 10);

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

class StructuredLogger implements LoggerService {
  private readonly pino: pino.Logger;

  constructor() {
    this.pino = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        log: (object) => {
          const span = trace.getSpan(context.active());
          const logObject: { [key: string]: any } = { ...object, service: SERVICE_NAME };
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
              options: { colorize: true, singleLine: true, messageFormat: '{service} - {msg}' },
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
 * Initializes and runs the Temporal Worker in the background.
 * The worker connects to the Temporal cluster and executes workflows and activities
 * defined in this service, such as the 'sendMoney' saga.
 * @param app - The NestJS application context to resolve DI for activities.
 * @param logger - The structured logger for worker-specific logs.
 */
async function runTemporalWorker(
  app: INestApplicationContext,
  logger: StructuredLogger,
) {
  logger.log('Initializing Temporal Worker for banking service...');

  const configService = app.get(ConfigService);
  // The service containing business logic for activities.
  // const bankingService = app.get(BankingService);

  const temporalAddress = configService.get<string>('TEMPORAL_ADDRESS');
  const taskQueue = configService.get<string>('TEMPORAL_BANKING_TASK_QUEUE', 'banking-workflows');

  const connection = await NativeConnection.create({ address: temporalAddress });

  const worker = await Worker.create({
    connection,
    namespace: configService.get<string>('TEMPORAL_NAMESPACE', 'default'),
    taskQueue,
    // These paths are placeholders and assume the new file structure will be created.
    // workflowsPath: require.resolve('./temporal/workflows'),
    // activities: activities.createActivities(bankingService),
  });

  logger.log(`Temporal Worker started. Listening on task queue: "${taskQueue}".`);
  await worker.run();
  logger.log('Temporal Worker has shut down.');
}

// --- 5. Application Bootstrap ---
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Run the Temporal Worker in the background; do not `await` its completion.
  // Note: This part is commented out as the required files (workflows, activities) are not yet in the repository.
  /*
  runTemporalWorker(app, logger).catch((err) => {
    logger.error('Temporal Worker crashed', err.stack, 'Bootstrap');
    process.exit(1);
  });
  */

  // Connect Kafka Microservice for event consumption/production
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: configService.getOrThrow<string>('KAFKA_BROKERS').split(','),
        clientId: SERVICE_NAME,
      },
      consumer: {
        groupId: configService.getOrThrow<string>('KAFKA_GROUP_ID', 'banking-service-group'),
      },
    },
  });

  await app.startAllMicroservices();
  logger.log('Kafka microservice connected.');

  app.enableCors();
  logger.log('CORS has been enabled.');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  logger.log('Global ValidationPipe configured.');

  const port = configService.get<number>('PORT') || 4001;
  await app.listen(port);

  logger.log(`🚀 Banking Subgraph is running on: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${PROMETHEUS_PORT}`);
}

bootstrap().catch((err) => {
  const logger = new StructuredLogger();
  logger.error('Application bootstrap failed', err.stack);
  process.exit(1);
});
