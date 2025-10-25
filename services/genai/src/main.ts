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
import pino from 'pino';
import vault from 'node-vault';

const SERVICE_NAME = 'genai-service';

// For troubleshooting OpenTelemetry, set the log level to DiagLogLevel.DEBUG
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9471', 10),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Gracefully shut down the SDK on process exit.
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log(`OpenTelemetry SDK for ${SERVICE_NAME} shut down successfully.`))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK.', error))
    .finally(() => process.exit(0));
});

otelSDK.start();

// --- 3. Vault Secret Fetching (Pre-bootstrap) ---
const preBootstrapLogger = pino({ level: process.env.LOG_LEVEL || 'info' });

async function fetchSecretsFromVault() {
  try {
    const vaultAddr = process.env.VAULT_ADDR;
    const roleId = process.env.VAULT_ROLE_ID;
    const secretId = process.env.VAULT_SECRET_ID;

    if (!vaultAddr || !roleId || !secretId) {
      preBootstrapLogger.warn(
        'Vault AppRole environment variables not set. Skipping secret fetching. This is not suitable for production.',
      );
      return;
    }

    const vaultClient = vault({ apiVersion: 'v1', endpoint: vaultAddr });

    preBootstrapLogger.info('Authenticating to Vault with AppRole...');
    const result = await vaultClient.approleLogin({ role_id: roleId, secret_id: secretId });
    vaultClient.token = result.auth.client_token;
    preBootstrapLogger.info('Successfully authenticated to Vault.');

    const secretPath = process.env.VAULT_KV_PATH || 'secret/data/demobank/genai-service';
    preBootstrapLogger.info(`Fetching secrets from Vault at path: ${secretPath}`);
    const secrets = await vaultClient.read(secretPath);

    if (!secrets?.data?.data) {
      throw new Error(`Secrets not found in Vault at path '${secretPath}' or data is empty.`);
    }

    // Set secrets as environment variables for ConfigService to pick up
    process.env.GEMINI_API_KEY = secrets.data.data.GEMINI_API_KEY;

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

  // Connect Kafka for event consumers, if any are defined in the service
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: configService.getOrThrow<string>('KAFKA_BROKERS').split(','),
        clientId: SERVICE_NAME,
      },
      consumer: {
        groupId: configService.getOrThrow<string>('KAFKA_GROUP_ID', 'genai-service-group'),
      },
    },
  });

  await app.startAllMicroservices();
  logger.log('Kafka microservice consumers started.');

  app.enableCors();
  logger.log('CORS has been enabled.');

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

  const port = configService.get<number>('port') || 4002;
  const prometheusPort = process.env.PROMETHEUS_PORT || '9471';

  await app.listen(port);

  logger.log(`🚀 GenAI Subgraph is running on: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${prometheusPort}`);
}

bootstrap().catch((err) => {
  preBootstrapLogger.error('Application bootstrap failed', err.stack);
  process.exit(1);
});
