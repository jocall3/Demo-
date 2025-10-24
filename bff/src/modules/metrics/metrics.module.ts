import { Module, Provider } from '@nestjs/common';
import { metrics, Meter, Counter } from '@opentelemetry/api';

// --- Injection Tokens ---
export const METER_TOKEN = 'METER_TOKEN';
export const GRAPHQL_REQUESTS_COUNTER = 'GRAPHQL_REQUESTS_COUNTER';
export const PLAID_ITEMS_COUNTER = 'PLAID_ITEMS_COUNTER';
export const GENAI_CALLS_COUNTER = 'GENAI_CALLS_COUNTER';
export const DOWNSTREAM_API_CALLS_COUNTER = 'DOWNSTREAM_API_CALLS_COUNTER';

// --- OpenTelemetry Meter Provider ---
const meterProvider: Provider = {
  provide: METER_TOKEN,
  useFactory: (): Meter => {
    // Meter is configured in `opentelemetry.ts` and registered globally.
    return metrics.getMeter('bff-subgraph');
  },
};

// --- Custom Metric Providers ---

// Note: While http.server.duration provides a count, a custom counter allows for specific GraphQL attributes.
const graphqlRequestsCounter: Provider = {
  provide: GRAPHQL_REQUESTS_COUNTER,
  useFactory: (meter: Meter): Counter =>
    meter.createCounter('bff_graphql_requests_total', {
      description: 'Total number of GraphQL requests processed, labeled by operation name and type.',
    }),
  inject: [METER_TOKEN],
};

const plaidItemsCounter: Provider = {
  provide: PLAID_ITEMS_COUNTER,
  useFactory: (meter: Meter): Counter =>
    meter.createCounter('bff_plaid_items_total', {
      description: 'Total number of Plaid items created (account links).',
    }),
  inject: [METER_TOKEN],
};

const genaiCallsCounter: Provider = {
  provide: GENAI_CALLS_COUNTER,
  useFactory: (meter: Meter): Counter =>
    meter.createCounter('bff_genai_calls_total', {
      description: 'Total number of calls to the GenAI service, labeled by model and status.',
    }),
  inject: [METER_TOKEN],
};

const downstreamApiCallsCounter: Provider = {
  provide: DOWNSTREAM_API_CALLS_COUNTER,
  useFactory: (meter: Meter): Counter =>
    meter.createCounter('bff_downstream_api_calls_total', {
      description: 'Total number of outbound calls to downstream APIs, labeled by service and status.',
    }),
  inject: [METER_TOKEN],
};

/**
 * The MetricsModule is responsible for creating and providing custom
 * application-specific metrics using the OpenTelemetry API.
 * 
 * It aligns with the global OpenTelemetry SDK setup in `opentelemetry.ts`, which handles
 * the exporting of metrics to a Prometheus-compatible endpoint. This module
 * focuses solely on the definition and dependency injection of custom metric instruments.
 * 
 * These metric instruments (e.g., counters) are exported as providers so they can be
 * injected into any service across the application to record business events.
 * 
 * Example usage in another service:
 * ```
 * constructor(
 *   @Inject(GENAI_CALLS_COUNTER) private genAICounter: Counter,
 * ) {}
 * 
 * async someMethod() {
 *   try {
 *     // ... call GenAI service
 *     this.genAICounter.add(1, { model: 'gemini-1.5-flash', operation: 'generateText', status: 'success' });
 *   } catch (error) {
 *     this.genAICounter.add(1, { model: 'gemini-1.5-flash', operation: 'generateText', status: 'error' });
 *     throw error;
 *   }
 * }
 * ```
 */
@Module({
  providers: [
    meterProvider,
    graphqlRequestsCounter,
    plaidItemsCounter,
    genaiCallsCounter,
    downstreamApiCallsCounter,
  ],
  exports: [
    GRAPHQL_REQUESTS_COUNTER,
    PLAID_ITEMS_COUNTER,
    GENAI_CALLS_COUNTER,
    DOWNSTREAM_API_CALLS_COUNTER,
  ],
})
export class MetricsModule {}
