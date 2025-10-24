import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { Resource } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// For troubleshooting, set the OpenTelemetry diagnostic logger to see internal logs.
// In production, this might be set to DiagLogLevel.ERROR or lower.
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Use environment variables for configuration, with sensible defaults.
// This aligns with the 'config/configuration.ts' setup for an API Gateway role.
const serviceName = process.env.OTEL_SERVICE_NAME || 'api-gateway';
const otelExporterOtlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const prometheusPort = parseInt(process.env.PROMETHEUS_PORT || '9464', 10);

let sdk: NodeSDK;

/**
 * Initializes and starts the OpenTelemetry SDK for the API Gateway service.
 * This function should be called at the very beginning of the application's lifecycle (in main.ts).
 */
export const initOpenTelemetry = () => {
  if (sdk) {
    console.log('OpenTelemetry SDK already initialized.');
    return;
  }

  // --- METRICS CONFIGURATION ---
  // The Prometheus exporter serves metrics on a /metrics endpoint.
  const prometheusExporter = new PrometheusExporter({
    port: prometheusPort,
    endpoint: '/metrics',
  });

  // The MetricReader connects the exporter to the SDK's MeterProvider.
  // It periodically collects and exports metrics.
  const metricReader = new PeriodicExportingMetricReader({
    exporter: prometheusExporter,
    exportIntervalMillis: 10000, // Export metrics every 10 seconds.
  });

  // --- TRACING CONFIGURATION ---
  // The OTLP (OpenTelemetry Protocol) exporter sends trace data.
  // It reads its configuration from standard environment variables.
  const traceExporter = new OTLPTraceExporter({
    url: `${otelExporterOtlpEndpoint}/v1/traces`,
  });

  // The SpanProcessor processes spans before they are exported.
  // BatchSpanProcessor is recommended for production environments.
  const spanProcessor = new BatchSpanProcessor(traceExporter);

  // --- OPENTELEMETRY SDK INITIALIZATION ---
  sdk = new NodeSDK({
    // Identifies this service, making it searchable and filterable in observability platforms.
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),

    // Connects the trace exporter.
    spanProcessor,

    // Connects the metrics exporter.
    metricReader,

    // Auto-instrumentation for popular Node.js libraries and frameworks.
    instrumentations: [
      new HttpInstrumentation(), // Traces outgoing HTTP requests (e.g., to subgraphs).
      new ExpressInstrumentation(), // Traces incoming requests handled by Express (used by NestJS).
      new NestInstrumentation(), // Enhances traces with NestJS-specific metadata.
      new GraphQLInstrumentation({
        // Optional configuration for deeper GraphQL instrumentation.
        // It can add significant detail (and overhead) to traces.
        depth: 2, // How deep to instrument nested resolvers.
        mergeItems: true, // Merge multiple resolver spans for the same field into one.
      }),
    ],
  });

  try {
    sdk.start();
    console.log(
      `OpenTelemetry SDK for '${serviceName}' service started successfully.`,
    );
    console.log(`Prometheus metrics will be available on port ${prometheusPort}.`);
  } catch (error) {
    console.error('Error starting OpenTelemetry SDK', error);
    process.exit(1);
  }

  // --- GRACEFUL SHUTDOWN ---
  // Add hooks for process termination signals to gracefully shut down the SDK.
  const shutdown = () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully.'))
      .catch((error) =>
        console.error('Error shutting down OpenTelemetry SDK', error),
      )
      .finally(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

/**
 * Returns the initialized OpenTelemetry SDK instance.
 * Can be used if direct access to the SDK is needed elsewhere.
 * @returns {NodeSDK} The SDK instance.
 */
export const getOpenTelemetrySdk = (): NodeSDK => {
  if (!sdk) {
    throw new Error(
      'OpenTelemetry SDK has not been initialized. Call initOpenTelemetry() first.',
    );
  }
  return sdk;
};
