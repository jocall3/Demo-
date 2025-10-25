import React from 'react';
import ReactDOM from 'react-dom/client';
import ShellApp from './App'; // Assuming the main App component of the shell is in ./App.tsx

// OpenTelemetry for client-side web instrumentation (copied from root index.tsx and generalized)
import { WebTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context } from '@opentelemetry/api';


/**
 * Initializes the OpenTelemetry Web SDK for client-side observability in the MFE Shell.
 * This setup captures and exports traces for page loads, user interactions,
 * and API requests (fetch/XHR), providing end-to-end visibility when
 * connected with a backend also instrumented with OpenTelemetry.
 */
const initializeOpenTelemetry = () => {
    // Define a resource to identify this service.
    const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: import.meta.env.VITE_OTEL_SERVICE_NAME || 'mfe-shell-frontend',
        [SemanticResourceAttributes.SERVICE_VERSION]: import.meta.env.VITE_APP_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env.MODE,
    });

    // Create a WebTracerProvider, which is the main entry point for the SDK.
    const provider = new WebTracerProvider({
        resource: resource,
    });

    // Configure an OTLP exporter to send trace data to an OpenTelemetry Collector.
    const exporter = new OTLPTraceExporter({
        url: import.meta.env.VITE_OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces',
    });

    // Use BatchSpanProcessor for efficiency in production.
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

    provider.register({
        contextManager: new ZoneContextManager(),
    });

    // Register automatic instrumentations to capture telemetry data from the browser.
    registerInstrumentations({
        instrumentations: [
            getWebAutoInstrumentations({
                '@opentelemetry/instrumentation-document-load': {},
                '@opentelemetry/instrumentation-user-interaction': {
                    enabled: true,
                },
                // This will automatically instrument GraphQL calls made over HTTP.
                // In production, restrict this to your API domains using a more specific regex.
                '@opentelemetry/instrumentation-fetch': {
                    enabled: true,
                    propagateTraceHeaderCorsUrls: [/.+/g],
                },
                '@opentelemetry/instrumentation-xml-http-request': {
                    enabled: true,
                    propagateTraceHeaderCorsUrls: [/.+/g],
                },
            }),
        ],
    });

    console.log(`OpenTelemetry Web SDK initialized for ${import.meta.env.VITE_OTEL_SERVICE_NAME || 'mfe-shell-frontend'}.`);

    // Create a root span to trace the application's initial load.
    const tracer = trace.getTracer(import.meta.env.VITE_OTEL_SERVICE_NAME || 'mfe-shell-frontend', import.meta.env.VITE_APP_VERSION || '1.0.0');
    const rootSpan = tracer.startSpan('mfe.shell.load');
    context.with(trace.setSpan(context.active(), rootSpan), () => {
        rootSpan.setAttribute('mfe.lifecycle', 'shell_initial_load');
        rootSpan.end();
    });
};

// Initialize OpenTelemetry as early as possible in the application lifecycle.
initializeOpenTelemetry();

// For Module Federation, this bootstrap file is often the entry point.
// It will render the main shell application.
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element to mount the MFE Shell application.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ShellApp />
  </React.StrictMode>
);

// If this MFE shell is exposing components, they would be defined and exported here.
// For now, it's just bootstrapping itself.
