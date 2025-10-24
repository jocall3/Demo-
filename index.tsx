import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Apollo Client for GraphQL integration
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

// Import OpenTelemetry packages for client-side web instrumentation
import { WebTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

/**
 * Initializes the OpenTelemetry Web SDK for client-side observability.
 * This setup captures and exports traces for page loads, user interactions,
 * and API requests (fetch/XHR), providing end-to-end visibility when
 * connected with a backend also instrumented with OpenTelemetry.
 */
const initializeOpenTelemetry = () => {
    // Define a resource to identify this service.
    const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'demobank-frontend',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0', // This could be dynamic (e.g., from package.json)
    });

    // Create a WebTracerProvider, which is the main entry point for the SDK.
    const provider = new WebTracerProvider({
        resource: resource,
    });

    // Configure an OTLP exporter to send trace data to an OpenTelemetry Collector.
    const exporter = new OTLPTraceExporter({
        url: import.meta.env.VITE_OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces',
    });

    // For production, BatchSpanProcessor is recommended for better performance.
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
                '@opentelemetry/instrumentation-fetch': {
                    enabled: true,
                    propagateTraceHeaderCorsUrls: [/.+/g], // In production, restrict this to your API domains.
                },
                '@opentelemetry/instrumentation-xml-http-request': {
                    enabled: true,
                    propagateTraceHeaderCorsUrls: [/.+/g],
                },
            }),
        ],
    });

    console.log('OpenTelemetry Web SDK initialized for demobank-frontend.');
};

// Initialize OpenTelemetry as early as possible in the application lifecycle.
initializeOpenTelemetry();

// Configure the Apollo Client to connect to the GraphQL Supergraph Gateway.
const client = new ApolloClient({
    uri: import.meta.env.VITE_GRAPHQL_GATEWAY_URL || 'http://localhost:4000/', // The URL of the Apollo Gateway
    cache: new InMemoryCache(),
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
