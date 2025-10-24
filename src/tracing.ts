import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context } from '@opentelemetry/api';

const SERVICE_NAME = import.meta.env.VITE_OTEL_SERVICE_NAME || 'demobank-frontend';
const SERVICE_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0';

/**
 * Initializes the OpenTelemetry Web SDK for tracing.
 * This function should be called once when the application starts up (e.g., in index.tsx).
 */
const initTracing = (): void => {
  // Do not initialize tracing more than once.
  if (trace.getTracerProvider().constructor.name !== 'NoopTracerProvider') {
    return;
  }

  // Define a "Resource" to identify this service.
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env.MODE,
  });

  // Create a WebTracerProvider.
  const provider = new WebTracerProvider({
    resource: resource,
  });

  // Configure an exporter to send trace data (OTLP/HTTP).
  const otelCollectorUrl = import.meta.env.VITE_OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces';
  const exporter = new OTLPTraceExporter({
    url: otelCollectorUrl,
  });

  // Use BatchSpanProcessor for efficiency in production.
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  // Register the provider with the OpenTelemetry API.
  provider.register({
    contextManager: new ZoneContextManager(),
  });

  // Register automatic instrumentations for web APIs.
  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [
          // This allows the `traceparent` header to be sent to the BFF.
          new RegExp(import.meta.env.VITE_BFF_URL || window.location.origin),
        ],
        applyCustomAttributesOnSpan: (span, request, result) => {
          span.setAttribute('http.request.headers', JSON.stringify(request.headers));
          if (result instanceof Error) {
            span.setAttribute('http.error.message', result.message);
          } else if (result) {
            span.setAttribute('http.status_text', result.statusText || '');
          }
        },
      }),
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: [
          new RegExp(import.meta.env.VITE_BFF_URL || window.location.origin),
        ],
      }),
    ],
  });

  console.log(`OpenTelemetry Tracing initialized for the '${SERVICE_NAME}' service.`);

  // Create a root span to trace the application's initial load.
  const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
  const rootSpan = tracer.startSpan('app.load');
  context.with(trace.setSpan(context.active(), rootSpan), () => {
    rootSpan.setAttribute('app.lifecycle', 'initial_load');
    rootSpan.end();
  });
};

export { initTracing };
