import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';

/**
 * Service responsible for creating, registering, and exposing Prometheus metrics.
 * This service follows the RED method (Rate, Errors, Duration) for monitoring
 * and includes custom business-level metrics.
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // --- Core Application Metrics (RED Method) ---
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;

  // --- Business & Service-specific Metrics ---
  private plaidApiInteractions: Counter<string>;
  private genAiApiInteractions: Counter<string>;
  private accountsLinkedTotal: Counter<string>;
  private activeUserSessions: Gauge<string>;

  constructor() {
    this.registry = new Registry();
    this.registry.setDefaultLabels({
      service: 'bff',
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
    // --- HTTP Metrics ---
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests made.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds.',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // Buckets in seconds
      registers: [this.registry],
    });

    // --- Plaid Metrics ---
    this.plaidApiInteractions = new Counter({
      name: 'plaid_api_calls_total',
      help: 'Total number of Plaid API calls.',
      labelNames: ['operation', 'status'], // e.g., operation='create_link_token', status='success'
      registers: [this.registry],
    });

    this.accountsLinkedTotal = new Counter({
      name: 'accounts_linked_total',
      help: 'Total number of new bank accounts successfully linked via Plaid.',
      registers: [this.registry],
    });

    // --- GenAI Metrics ---
    this.genAiApiInteractions = new Counter({
      name: 'genai_api_calls_total',
      help: 'Total number of GenAI API calls.',
      labelNames: ['model', 'operation', 'status'], // e.g., model='gemini-1.5-flash', operation='chat'
      registers: [this.registry],
    });

    // --- Session/User Metrics ---
    this.activeUserSessions = new Gauge({
      name: 'active_user_sessions_total',
      help: 'Number of active user sessions.',
      registers: [this.registry],
    });
  }

  // --- Public Methods for Services to Use ---

  incrementHttpRequestsTotal(
    method: string,
    route: string,
    statusCode: number,
  ) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode,
    });
  }

  observeHttpRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    durationInSeconds: number,
  ) {
    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      durationInSeconds,
    );
  }

  incrementPlaidApiCall(operation: string, status: 'success' | 'failure') {
    this.plaidApiInteractions.inc({ operation, status });
  }

  incrementAccountsLinked() {
    this.accountsLinkedTotal.inc();
  }

  incrementGenAiApiCall(
    model: string,
    operation: string,
    status: 'success' | 'failure',
  ) {
    this.genAiApiInteractions.inc({ model, operation, status });
  }

  setActiveSessions(count: number) {
    this.activeUserSessions.set(count);
  }

  /**
   * Gets the application's metrics in Prometheus format.
   * @returns A promise that resolves to the metrics string.
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }
}
