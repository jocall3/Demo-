import { Module, Provider } from '@nestjs/common';
import { metrics, Meter, Counter } from '@opentelemetry/api';

// --- Injection Tokens ---
// Using string tokens for DI is a robust way to handle non-class providers.
export const METER_PROVIDER_TOKEN = 'METER_PROVIDER';
export const GRAPHQL_REQUESTS_COUNTER_TOKEN = 'GRAPHQL_REQUESTS_COUNTER';
export const PLAID_ITEMS_CREATED_COUNTER_TOKEN = 'PLAID_ITEMS_CREATED_COUNTER';
export const GENAI_REQUESTS_COUNTER_TOKEN = 'GENAI_REQUESTS_COUNTER';
export const DOWNSTREAM_API_ERRORS_COUNTER_TOKEN = 'DOWNSTREAM_API_ERRORS_COUNTER';

// --- OpenTelemetry Meter Provider ---
// This provider makes the OpenTelemetry Meter available for injection.
const meterProvider: Provider = {
  provide: METER_PROVIDER_TOKEN,
  useFactory: (): Meter => {
    // Get a meter from the global meter provider, which is configured in main.ts
    // The name 'bff-application' helps to namespace these metrics.
    return metrics.getMeter('bff-application');
  },
};

// --- Custom Metric Providers ---
// Each custom metric is defined as a factory provider that depends on the Meter.

const graphqlRequestsCounterProvider: Provider = {
  provide: GRAPHQL_REQUESTS_COUNTER_TOKEN,
  useFactory: (meter: Meter): Counter =>
    meter.createCounter('bff_graphql_requests_total', {
      description: 'Total number of GraphQL requests.',
      unit: '1',
    }),
  inject: [METER_PROVIDER_TOKEN],
};

const plaidItemsCreatedCounterProvider: Provider = {
  provide: PLAID_ITEMS_CREATED_COUNTER_TOKEN,
  useFactory: (meter: Meter): Counter =>
    meter.createCounter('bff_plaid_items_created_total', {
      description: 'Total number of successful Plaid item creations (account links).',
      unit: '1',
    }),
  inject: [METER_PROVIDER_TOKEN],
};

const genAIRequestsCounterProvider: Provider = {
  provide: GENAI_REQUESTS_COUNTER_TOKEN,
  useFactory: (meter: Meter): Counter =>
    meter.createCounter('bff_genai_requests_total', {
      description: 'Total number of requests to the GenAI service.',
      unit: '1',
    }),
  inject: [METER_PROVIDER_TOKEN],
};

const downstreamApiErrorsCounterProvider: Provider = {
  provide: DOWNSTREAM_API_ERRORS_COUNTER_TOKEN,
  useFactory: (meter: Meter): Counter =>
    meter.createCounter('bff_downstream_api_errors_total', {
      description: 'Total number of failed requests to downstream APIs.',
      unit: '1',
    }),
  inject: [METER_PROVIDER_TOKEN],
};

// --- Module Definition ---
/**
 * The MetricsModule is responsible for creating and providing custom
 * application-specific metrics (business KPIs) using the OpenTelemetry API.
 * 
 * It aligns with the global OpenTelemetry SDK setup in `main.ts`, which handles
 * the exporting of metrics to a Prometheus-compatible endpoint. This module
 * focuses solely on the definition and dependency injection of custom metric instruments.
 * 
 * These metric instruments (e.g., counters) are exported as providers so they can be
 * injected into any service across the application to record business events.
 * 
 * Example usage in a service:
 * ```
 * constructor(
 *   @Inject(GENAI_REQUESTS_COUNTER_TOKEN) private genAICounter: Counter,
 * ) {}
 * 
 * someMethod() {
 *   // ...
 *   this.genAICounter.add(1, { 'model': 'gemini-1.5-flash', 'status': 'success' });
 * }
 * ```
 */
@Module({
  providers: [
    meterProvider,
    graphqlRequestsCounterProvider,
    plaidItemsCreatedCounterProvider,
    genAIRequestsCounterProvider,
    downstreamApiErrorsCounterProvider,
  ],
  exports: [
    GRAPHQL_REQUESTS_COUNTER_TOKEN,
    PLAID_ITEMS_CREATED_COUNTER_TOKEN,
    GENAI_REQUESTS_COUNTER_TOKEN,
    DOWNSTREAM_API_ERRORS_COUNTER_TOKEN,
  ],
})
export class MetricsModule {}
