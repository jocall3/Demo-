import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider } from '@willsoto/nestjs-prometheus';

/**
 * Business KPI Metrics Definition
 * These counters are defined as providers to be injected into services
 * where the corresponding business events occur.
 */

// Counter for successful Plaid item creations (account links)
export const PlaidItemsCreatedCounter = makeCounterProvider({
  name: 'bff_plaid_items_created_total',
  help: 'Total number of successful Plaid item creations (account links).',
});

// Counter for GenAI requests by model
export const GenAIRequestsCounter = makeCounterProvider({
  name: 'bff_genai_requests_total',
  help: 'Total number of requests to the GenAI service, partitioned by model.',
  labelNames: ['model', 'status'], // status can be 'success' or 'error'
});

// Counter for failed downstream API calls (e.g., Plaid, Stripe, GenAI)
export const DownstreamApiErrorsCounter = makeCounterProvider({
  name: 'bff_downstream_api_errors_total',
  help: 'Total number of failed requests to downstream APIs.',
  labelNames: ['service'], // e.g., 'plaid', 'stripe', 'genai'
});

/**
 * The MetricsModule is responsible for setting up the Prometheus endpoint
 * and providing custom application-specific metrics (business KPIs).
 *
 * It registers the main Prometheus module, which automatically exposes a /metrics
 * endpoint and collects default Node.js/process metrics.
 *
 * Application performance metrics (Rate, Errors, Duration) for HTTP requests
 * are intended to be configured globally in AppModule via middleware or an interceptor
 * provided by the '@willsoto/nestjs-prometheus' library.
 */
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true, // Collects default metrics like process_cpu_user_seconds_total
        config: {
          // Optional: Add a prefix to all default metrics to namespace them
          prefix: 'bff_',
        },
      },
    }),
  ],
  providers: [
    // Provide the custom metrics so they can be injected into other services.
    PlaidItemsCreatedCounter,
    GenAIRequestsCounter,
    DownstreamApiErrorsCounter,
  ],
  exports: [
    // Export the custom metrics to make them available for injection in other modules.
    PlaidItemsCreatedCounter,
    GenAIRequestsCounter,
    DownstreamApiErrorsCounter,
  ],
})
export class MetricsModule {}
