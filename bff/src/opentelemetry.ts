import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { Resource } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// For troubleshooting, set the OpenTelemetry diagnostic logger to see internal logs.
// In production, this might be set to DiagLogLevel.ERROR or lower.
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const serviceName = 'bff';
let sdk: NodeSDK;

/**
 * Initializes and starts the OpenTelemetry SDK for the BFF service.
 * This function should be called at the very beginning of the application's lifecycle (e.g., in main.ts).
 */
export const initOpenTelemetry = () => {
  if (sdk) {
    console.log('OpenTelemetry SDK already initialized.');
    return;
  }

  // --- METRICS CONFIGURATION ---
  // The Prometheus exporter serves metrics on a /metrics endpoint.
  const prometheusExporter = new PrometheusExporter({
    port: 9464, // Default Prometheus scrape port. Ensure this doesn't conflict with other services.
    endpoint: '/metrics',
  });

  // The MetricReader connects the exporter to the SDK's MeterProvider.
  // It periodically collects and exports metrics.
  const metricReader = new PeriodicExportingMetricReader({
    exporter: prometheusExporter,
    exportIntervalMillis: 10000, // Export metrics every 10 seconds
  });

  // --- TRACING CONFIGURATION ---
  // The OTLP (OpenTelemetry Protocol) exporter sends trace data.
  // By default, it sends to a local OpenTelemetry Collector at http://localhost:4318/v1/traces.
  // This can be configured with environment variables like:
  // - OTEL_EXPORTER_OTLP_ENDPOINT
  // - OTEL_EXPORTER_OTLP_HEADERS
  const traceExporter = new OTLPTraceExporter();

  // The SpanProcessor processes spans before they are exported.
  // BatchSpanProcessor is recommended for production environments for better performance.
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

    // Auto-instrumentation for popular Node.js libraries.
    instrumentations: [
      new HttpInstrumentation(), // Traces outgoing HTTP requests made with http/https module.
      new ExpressInstrumentation(), // Traces incoming requests handled by Express (used by NestJS).
      new NestInstrumentation(), // Enhances traces with NestJS-specific metadata (e.g., controller/handler names).
    ],
  });

  try {
    sdk.start();
    console.log('OpenTelemetry SDK for BFF service started successfully.');
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
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
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
