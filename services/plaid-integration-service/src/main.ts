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

const SERVICE_NAME = 'plaid-integration-service';

const otelSDK = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter(),
  // Use a different port for Prometheus to avoid conflicts with other services.
  metricReader: new PrometheusExporter({
    port: parseInt(process.env.PROMETHEUS_PORT || '9466', 10),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Gracefully shut down the SDK on process exit to flush telemetry
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => console.log(`OpenTelemetry SDK for ${SERVICE_NAME} shut down successfully.`))
    .catch((error) => console.log('Error shutting down OpenTelemetry SDK.', error))
    .finally(() => process.exit(0));
});

// Start the OpenTelemetry SDK
otelSDK.start();

// --- 2. NestJS Application Imports (after OTel setup) ---
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';

// --- 3. Structured Logging with OpenTelemetry Context ---
class StructuredLogger implements LoggerService {
  private readonly pino: pino.Logger;
  private readonly serviceName = SERVICE_NAME;

  constructor() {
    this.pino = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        log: (object) => {
          const span = trace.getSpan(context.active());
          const logObject: { [key: string]: any } = { ...object, service: this.serviceName };
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

// --- 4. Application Bootstrap ---
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const logger = app.get(StructuredLogger);
  const configService = app.get(ConfigService);

  // Enable CORS - useful for allowing Apollo Studio to introspect the subgraph in development
  app.enableCors();
  logger.log('CORS has been enabled.');

  // Global pipes for validation and transformation of DTOs/Args
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  logger.log('Global ValidationPipe configured.');

  // Get port from environment variables, with a fallback
  const port = configService.get<number>('PORT') || 4004;
  const prometheusPort = process.env.PROMETHEUS_PORT || '9466';

  await app.listen(port);

  logger.log(`🚀 Plaid Integration subgraph is running on: http://localhost:${port}`);
  logger.log(`GraphQL endpoint available at: http://localhost:${port}/graphql`);
  logger.log(`Prometheus metrics available on port ${prometheusPort}`);
}

bootstrap();
