/**
 * main.ts
 *
 * This is the entry point for the Plaid subgraph service.
 * It initializes and configures the NestJS application for the Apollo Federation,
 * setting up observability (tracing, metrics, logging), fetching secrets from Vault,
 * and starting the server.
 *
 * ARCHITECTURAL UPDATE:
 * - Added integration with HashiCorp Vault to fetch secrets at runtime.
 * - Uses AppRole authentication for secure, automated secret retrieval.
 * - Secrets are injected into the process environment before the application starts.
 * - Full observability stack with OpenTelemetry and structured Pino logging is included.
 * - Connects to Kafka as a consumer for event-driven patterns.
 */

// --- 1. Observability Setup (MUST be imported and executed before ANY other module) ---
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagConsoleLogger, DiagLogLevel, trace, context } from '@opentelemetry/api';

// --- 2. Application Imports (after OTel setup) ---
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import vault from 'node-vault';
import pino from 'pino';

// --- 3. OpenTelemetry and Logging Configuration ---
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'plaid-service';
const PROMETHEUS_PORT = parseInt(process.env.PROMETHEUS_PORT || '9469', 10);

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

// --- 4. Vault Secret Fetching ---
const preBootstrapLogger = pino({ level: process.env.LOG_LEVEL || 'info' });

async function fetchSecretsFromVault() {
  try {
    const vaultAddr = process.env.VAULT_ADDR;
    const roleId = process.env.VAULT_ROLE_ID;
    const secretId = process.env.VAULT_SECRET_ID;

    if (!vaultAddr || !roleId || !secretId) {
      preBootstrapLogger.warn('Vault AppRole environment variables not set. Skipping secret fetching from Vault. This is not suitable for production.');
      return;
    }

    const vaultClient = vault({ apiVersion: 'v1', endpoint: vaultAddr });

    preBootstrapLogger.info('Authenticating to Vault with AppRole...');
    const result = await vaultClient.approleLogin({ role_id: roleId, secret_id: secretId });
    vaultClient.token = result.auth.client_token;
    preBootstrapLogger.info('Successfully authenticated to Vault.');

    const secretPath = process.env.VAULT_SECRETS_PATH || 'secret/data/plaid-service';
    preBootstrapLogger.info(`Fetching secrets from Vault at path: ${secretPath}`);
    const secrets = await vaultClient.read(secretPath);

    if (!secrets?.data?.data) {
      throw new Error(`Plaid secrets not found in Vault at path '${secretPath}' or data is empty.`);
    }

    // Set secrets as environment variables for ConfigService to pick up
    process.env.PLAID_CLIENT_ID = secrets.data.data.PLAID_CLIENT_ID;
    process.env.PLAID_SECRET = secrets.data.data.PLAID_SECRET;

    preBootstrapLogger.info('Successfully fetched and configured Plaid secrets from Vault.');
  } catch (error) {
    preBootstrapLogger.error({ err: error }, 'Failed to fetch secrets from Vault. Application will exit.');
    process.exit(1);
  }
}

// --- 5. Structured Logging with OpenTelemetry Context ---
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

// --- 6. Application Bootstrap ---
async function bootstrap() {
  await fetchSecretsFromVault();

  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Connect Kafka Microservice for event-driven communication (CQRS read model updates).
  const kafkaBrokers = configService.get<string>('KAFKA_BROKERS');
  if (kafkaBrokers) {
    app.connectMicroservice({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: configService.get<string>('KAFKA_CLIENT_ID', SERVICE_NAME),
          brokers: kafkaBrokers.split(','),
        },
        consumer: {
          groupId: configService.getOrThrow<string>('KAFKA_GROUP_ID', 'plaid-service-group'),
        },
      },
    });
    await app.startAllMicroservices();
    logger.log('Kafka microservice connected and listening for events.');
  } else {
    logger.warn('KAFKA_BROKERS not found in environment. Skipping Kafka consumer connection.');
  }

  app.enableCors();
  logger.log('CORS has been enabled for all origins.');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  logger.log('Global ValidationPipe configured.');

  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') || 4005;
  await app.listen(port);

  logger.log(`🚀 Plaid subgraph is running on: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${PROMETHEUS_PORT}`);
}

bootstrap().catch(err => {
  preBootstrapLogger.error(err, 'Application bootstrap failed');
  process.exit(1);
});
