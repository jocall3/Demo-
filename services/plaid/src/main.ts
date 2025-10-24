/**
 * main.ts
 *
 * This is the entry point for the Plaid subgraph service.
 * It initializes and configures the NestJS application for the Apollo Federation,
 * setting up observability (tracing, metrics, logging) and starting the server.
 *
 * ARCHITECTURAL UPDATE:
 * - Added integration with HashiCorp Vault to fetch secrets at runtime.
 * - Uses AppRole authentication for secure, automated secret retrieval.
 * - Secrets are injected into the process environment before the application starts.
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

const SERVICE_NAME = 'plaid-service';

const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter(),
  // Use a different port for Prometheus to avoid conflicts with other services.
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PLAID_PROMETHEUS_PORT || '9466', 10),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully.'))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK.', error))
    .finally(() => process.exit(0));
});

otelSDK.start();

// --- 2. Application Imports (after OTel setup) ---
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import vault from 'node-vault';
import pino from 'pino';

// --- 3. Vault Secret Fetching ---
// A simple logger for pre-bootstrap tasks like secret fetching.
const preBootstrapLogger = pino({ level: process.env.LOG_LEVEL || 'info' });

async function fetchSecretsFromVault() {
  try {
    const vaultAddr = process.env.VAULT_ADDR;
    const roleId = process.env.VAULT_ROLE_ID;
    const secretId = process.env.VAULT_SECRET_ID;

    if (!vaultAddr || !roleId || !secretId) {
      preBootstrapLogger.warn(
        'Vault environment variables (VAULT_ADDR, VAULT_ROLE_ID, VAULT_SECRET_ID) are not set. Skipping secret fetching. This is not suitable for production.',
      );
      return;
    }

    const vaultClient = vault({
      apiVersion: 'v1',
      endpoint: vaultAddr,
    });

    preBootstrapLogger.info('Authenticating to Vault with AppRole...');
    const result = await vaultClient.approleLogin({
      role_id: roleId,
      secret_id: secretId,
    });

    vaultClient.token = result.auth.client_token;
    preBootstrapLogger.info('Successfully authenticated to Vault.');

    const secretPath = 'secret/data/demobank/plaid';
    preBootstrapLogger.info(`Fetching secrets from Vault at path: ${secretPath}`);
    const secrets = await vaultClient.read(secretPath);

    if (!secrets?.data?.data) {
      throw new Error(`Plaid secrets not found in Vault at path '${secretPath}' or data is empty.`);
    }

    // Set secrets as environment variables for ConfigService to pick up
    process.env.PLAID_CLIENT_ID = secrets.data.data.CLIENT_ID;
    process.env.PLAID_SECRET = secrets.data.data.SECRET;

    preBootstrapLogger.info('Successfully fetched and configured Plaid secrets from Vault.');
  } catch (error) {
    preBootstrapLogger.error({ err: error }, 'Failed to fetch secrets from Vault. Application will exit.');
    process.exit(1);
  }
}

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

// --- 5. Application Bootstrap ---
async function bootstrap() {
  // First, fetch secrets from Vault and populate the environment
  await fetchSecretsFromVault();

  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Enable CORS for local development, allowing tools like Apollo Studio to connect.
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
  logger.log('Global ValidationPipe configured.');

  const port = configService.get<number>('port') || 4005; // Default port for Plaid service
  const prometheusPort = process.env.PLAID_PROMETHEUS_PORT || '9466';

  await app.listen(port);

  const appUrl = await app.getUrl();
  logger.log(`ðŸš€ Plaid subgraph is running on: ${appUrl}/graphql`);
  logger.log(`Prometheus metrics available on port ${prometheusPort}`);
}

bootstrap();
