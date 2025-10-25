/**
 * main.ts
 * Entry point for the AI Agent microservice.
 *
 * ARCHITECTURAL REFACTOR:
 * This file has been significantly updated to align with the new architectural directives:
 * 1.  OpenTelemetry SDK Initialization: Tracing and metrics are initialized at the very start of the process.
 * 2.  HashiCorp Vault Integration: Secrets are fetched from Vault before the application bootstraps, populating environment variables.
 * 3.  Structured Logging: A custom Pino-based logger is used, which automatically injects OpenTelemetry trace and span IDs.
 * 4.  Temporal Worker Bootstrap: In addition to starting the NestJS web server for the GraphQL API, this file now also bootstraps and runs the Temporal Worker in the same process. The worker is responsible for executing the long-running workflows and activities that define the service's core business logic.
 * 5.  Graceful Shutdown: Handlers are in place for both the OTel SDK and the NestJS application.
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

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'ai-agent-service';
const PROMETHEUS_PORT = parseInt(process.env.PROMETHEUS_PORT || '9467', 10);

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

// --- 2. Application Imports (after OTel setup) ---
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport, ClientKafka } from '@nestjs/microservices';
import pino from 'pino';
import vault from 'node-vault';
import { NativeConnection, Worker } from '@temporalio/worker';
import { AgentService } from './application/services/agent.service';
import * as activities from './temporal/activities';
import { KAFKA_CLIENT } from './event-bus/event-bus.module';

// --- 3. Vault Secret Fetching ---
const preBootstrapLogger = pino({ level: process.env.LOG_LEVEL || 'info' });

async function fetchSecretsFromVault() {
  try {
    const vaultAddr = process.env.VAULT_ADDR;
    const roleId = process.env.VAULT_ROLE_ID;
    const secretId = process.env.VAULT_SECRET_ID;

    if (!vaultAddr || !roleId || !secretId) {
      preBootstrapLogger.warn(
        'Vault AppRole environment variables not set. Skipping secret fetching from Vault. This is not suitable for production.',
      );
      return;
    }

    const vaultClient = vault({ apiVersion: 'v1', endpoint: vaultAddr });

    preBootstrapLogger.info('Authenticating to Vault with AppRole...');
    const result = await vaultClient.approleLogin({ role_id: roleId, secret_id: secretId });
    vaultClient.token = result.auth.client_token;
    preBootstrapLogger.info('Successfully authenticated to Vault.');

    const secretPath = process.env.VAULT_KV_PATH;
    if (!secretPath) {
        throw new Error('VAULT_KV_PATH environment variable not set.');
    }

    preBootstrapLogger.info(`Fetching secrets from Vault at path: ${secretPath}`);
    const secrets = await vaultClient.read(secretPath);

    if (!secrets?.data?.data) {
      throw new Error(`Secrets not found in Vault at path '${secretPath}' or data is empty.`);
    }

    // Set secrets as environment variables for ConfigService to pick up
    process.env.GOOGLE_GEMINI_API_KEY = secrets.data.data.GOOGLE_GEMINI_API_KEY;

    preBootstrapLogger.info('Successfully fetched and configured secrets from Vault.');
  } catch (error) {
    preBootstrapLogger.error({ err: error }, 'Failed to fetch secrets from Vault. Application will exit.');
    process.exit(1);
  }
}

// --- 4. Structured Logging with OpenTelemetry Context ---
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

// --- 5. Application Bootstrap ---
async function bootstrap() {
  await fetchSecretsFromVault();

  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  const runTemporalWorker = async () => {
    logger.log('Initializing Temporal Worker...');

    const workerAppContext = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const agentService = workerAppContext.get(AgentService);
    const kafkaClient = workerAppContext.get<ClientKafka>(KAFKA_CLIENT);

    const connection = await NativeConnection.create({
      address: configService.get<string>('TEMPORAL_ADDRESS'),
    });

    const worker = await Worker.create({
      connection,
      namespace: configService.get<string>('TEMPORAL_NAMESPACE', 'default'),
      taskQueue: configService.get<string>('TEMPORAL_TASK_QUEUE', 'ai-agent-tasks'),
      workflowsPath: require.resolve('./temporal/workflows'),
      activities: activities.createActivities(agentService, kafkaClient),
    });

    logger.log(`Temporal Worker started. Listening on task queue: "${configService.get<string>('TEMPORAL_TASK_QUEUE', 'ai-agent-tasks')}".`);
    await worker.run();
    logger.log('Temporal Worker has shut down.');
    await workerAppContext.close();
  };

  runTemporalWorker().catch((err) => {
    logger.error('Temporal Worker crashed', err.stack, 'Bootstrap');
    process.exit(1);
  });

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

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  logger.log('Global ValidationPipe configured.');

  const port = configService.get<number>('PORT') || 4004;
  await app.listen(port);

  logger.log(`ðŸš€ AI Agent Service (GraphQL API) is running on: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${PROMETHEUS_PORT}`);
}

bootstrap().catch((err) => {
  preBootstrapLogger.error('Application bootstrap failed', err.stack);
  process.exit(1);
});
});
