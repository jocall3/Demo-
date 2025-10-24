import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
} from 'prom-client';

/**
 * Service responsible for creating, registering, and exposing Prometheus metrics.
 * This service is tailored for a GraphQL API and includes custom business-level metrics.
 * It uses the 'prom-client' library directly to provide granular control over metrics.
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // --- Core GraphQL Metrics (RED Method) ---
  private graphqlRequestsTotal: Counter<string>;
  private graphqlRequestDuration: Histogram<string>;

  // --- Business & Downstream Service Metrics ---
  private downstreamApiInteractions: Counter<string>;
  private accountsLinkedTotal: Counter<string>;
  private genAiApiInteractions: Counter<string>;

  constructor() {
    this.registry = new Registry();
    this.registry.setDefaultLabels({
      service: 'bff-graphql',
    });
    this.registerMetrics();
  }

  onModuleInit() {
    // Collect default metrics (e.g., CPU, memory usage, event loop lag).
    collectDefaultMetrics({ register: this.registry });
  }

  /**
   * Initializes all custom Prometheus metrics for the application.
   */
  private registerMetrics() {
    // --- GraphQL Metrics ---
    this.graphqlRequestsTotal = new Counter({
      name: 'graphql_requests_total',
      help: 'Total number of GraphQL requests.',
      labelNames: ['operation_type', 'operation_name', 'status'], // status: 'success' | 'error'
      registers: [this.registry],
    });

    this.graphqlRequestDuration = new Histogram({
      name: 'graphql_request_duration_seconds',
      help: 'Duration of GraphQL requests in seconds.',
      labelNames: ['operation_type', 'operation_name'],
      buckets: [0.05, 0.1, 0.3, 0.5, 0.7, 1, 3, 5], // Buckets in seconds
      registers: [this.registry],
    });

    // --- Downstream API Metrics ---
    this.downstreamApiInteractions = new Counter({
      name: 'downstream_api_calls_total',
      help: 'Total number of downstream API calls.',
      labelNames: ['service', 'operation', 'status'], // e.g., service='plaid', operation='create_link_token', status='success'
      registers: [this.registry],
    });

    // --- Business KPI Metrics ---
    this.accountsLinkedTotal = new Counter({
      name: 'accounts_linked_total',
      help: 'Total number of new bank accounts successfully linked via Plaid.',
      registers: [this.registry],
    });

    this.genAiApiInteractions = new Counter({
      name: 'genai_api_calls_total',
      help: 'Total number of GenAI API calls with model-specific details.',
      labelNames: ['model', 'operation', 'status'],
      registers: [this.registry],
    });
  }

  // --- Public Methods for Services and Interceptors to Use ---

  incrementGraphqlRequests(
    operationType: 'query' | 'mutation',
    operationName: string,
    status: 'success' | 'error',
  ) {
    this.graphqlRequestsTotal.inc({
      operation_type: operationType,
      operation_name: operationName,
      status,
    });
  }

  observeGraphqlRequestDuration(
    operationType: 'query' | 'mutation',
    operationName: string,
  ): (labels?: object) => void {
    return this.graphqlRequestDuration.startTimer({
      operation_type: operationType,
      operation_name: operationName,
    });
  }

  incrementDownstreamApiCall(
    service: 'plaid' | 'stripe' | 'genai',
    operation: string,
    status: 'success' | 'failure',
  ) {
    this.downstreamApiInteractions.inc({ service, operation, status });
  }

  incrementAccountsLinked() {
    this.accountsLinkedTotal.inc();
  }

  incrementGenAiApiCall(
    model: string,
    operation: string,
    status: 'success' | 'failure',
  ) {
    // Increment the generic downstream counter as well for aggregated views
    this.incrementDownstreamApiCall('genai', operation, status);

    // Increment the specific GenAI counter with model details
    this.genAiApiInteractions.inc({ model, operation, status });
  }

  /**
   * Gets the application's metrics in Prometheus format.
   * This method is called by the MetricsController to expose the metrics.
   * @returns A promise that resolves to the metrics string.
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Returns the content type for the metrics endpoint, required by Prometheus scrapers.
   * This method is called by the MetricsController.
   * @returns The content type string.
   */
  getContentType(): string {
    return this.registry.contentType;
  }
}
