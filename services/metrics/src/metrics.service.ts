import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { APIProvider, APIStatus, APIStatusType } from './graphql.schema';

/**
 * Interface for the structure of a successful Prometheus query response.
 */
interface PrometheusResponse {
  status: 'success' | 'error';
  data: {
    resultType: 'vector' | 'matrix';
    result: {
      metric: Record<string, string>;
      value: [number, string]; // [timestamp, value]
    }[];
  };
}

/**
 * A mapping from the GraphQL APIProvider enum to the job names
 * configured in Prometheus. This allows the service to query metrics
 * for each specific downstream service that is part of the supergraph.
 */
const providerToJobMapping: Record<string, string> = {
  // Assuming job names are aligned with service names for simplicity
  [APIProvider.Plaid]: 'banking',
  [APIProvider.Stripe]: 'payments',
  [APIProvider.GoogleGemini]: 'genai',
  // The following are from the GraphQL schema but might not have running services yet.
  // We will map them to placeholder job names.
  [APIProvider.Marqeta]: 'cards',
  [APIProvider.ModernTreasury]: 'treasury',
};

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly prometheusUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.prometheusUrl = this.configService.get<string>('PROMETHEUS_URL');
    if (!this.prometheusUrl) {
      this.logger.warn(
        'PROMETHEUS_URL is not configured. Metrics service will return dummy data.',
      );
    }
  }

  /**
   * Fetches the current operational status of all critical downstream API providers.
   * This method queries a Prometheus instance to determine the health, latency,
   * and error rate for each service defined in the providerToJobMapping.
   * @returns A promise that resolves to an array of APIStatus objects.
   */
  async getApiStatuses(): Promise<APIStatus[]> {
    if (!this.prometheusUrl) {
      return this.getDummyApiStatuses();
    }

    const providers = Object.keys(providerToJobMapping) as APIProvider[];
    const statusPromises = providers.map((provider) =>
      this.getSingleApiStatus(provider),
    );

    return Promise.all(statusPromises);
  }

  /**
   * Generates mock/dummy data for API statuses when Prometheus is not configured.
   * This is useful for development and UI testing.
   */
  private getDummyApiStatuses(): APIStatus[] {
    this.logger.log('Generating dummy API status data.');
    const statuses = [
      APIStatusType.Operational,
      APIStatusType.Operational,
      APIStatusType.DegradedPerformance,
      APIStatusType.PartialOutage,
      APIStatusType.MajorOutage,
    ];
    return (Object.keys(providerToJobMapping) as APIProvider[]).map(
      (provider, index) => ({
        provider,
        status: statuses[index % statuses.length],
        responseTime: Math.floor(Math.random() * 500) + 50,
      }),
    );
  }

  /**
   * Fetches and calculates the status for a single API provider.
   * @param provider The APIProvider enum member.
   * @returns A promise resolving to the APIStatus for the given provider.
   */
  private async getSingleApiStatus(provider: APIProvider): Promise<APIStatus> {
    const job = providerToJobMapping[provider];
    const defaultErrorStatus: APIStatus = {
      provider,
      status: APIStatusType.MajorOutage,
      responseTime: -1,
    };

    try {
      // Run all Prometheus queries in parallel for efficiency.
      const [upResult, p95LatencyResult, errorRateResult] = await Promise.all([
        this.runPrometheusQuery(`up{job="${job}"}`),
        this.runPrometheusQuery(`histogram_quantile(0.95, sum(rate(http_server_duration_seconds_bucket{job="${job}"}[5m])) by (le)) `),
        this.runPrometheusQuery(`(sum(rate(http_server_duration_seconds_count{job="${job}",http_status_code=~"5.."}[5m])) / sum(rate(http_server_duration_seconds_count{job="${job}"}[5m]))) * 100`),
      ]);

      const isUp = upResult.length > 0 && upResult[0] === 1;
      if (!isUp) {
        this.logger.warn(`Service with job '${job}' is down according to Prometheus.`);
        return defaultErrorStatus;
      }

      const latencyMs = p95LatencyResult.length > 0 ? Math.round(p95LatencyResult[0] * 1000) : 0;
      const errorRate = errorRateResult.length > 0 ? errorRateResult[0] : 0;

      const status = this.determineStatus(errorRate, latencyMs);

      return {
        provider,
        status,
        responseTime: latencyMs,
      };
    } catch (error) {
      this.logger.error(`Failed to get status for ${provider} (job: ${job})`, error.stack);
      return defaultErrorStatus;
    }
  }

  /**
   * Determines the APIStatusType based on error rate and latency thresholds.
   * @param errorRate The error rate percentage.
   * @param latencyMs The P95 latency in milliseconds.
   * @returns The calculated APIStatusType.
   */
  private determineStatus(errorRate: number, latencyMs: number): APIStatusType {
    if (errorRate > 5) {
      return APIStatusType.PartialOutage;
    }
    if (errorRate > 1 || latencyMs > 1000) {
      return APIStatusType.DegradedPerformance;
    }
    return APIStatusType.Operational;
  }

  /**
   * A generic helper to execute a PromQL query and parse the result.
   * @param query The PromQL query string.
   * @returns A promise resolving to an array of numeric values from the query result vector.
   */
  private async runPrometheusQuery(query: string): Promise<number[]> {
    const url = `${this.prometheusUrl}/api/v1/query`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<PrometheusResponse>(url, {
          params: { query },
        }),
      );

      if (response.data.status !== 'success') {
        throw new Error(`Prometheus query failed: ${JSON.stringify(response.data)}`);
      }

      if (response.data.data.resultType !== 'vector') {
        this.logger.warn(`Expected Prometheus vector result, but got ${response.data.data.resultType}. Query: ${query}`);
        return [];
      }

      return response.data.data.result.map(res => parseFloat(res.value[1]));
    } catch (error) {
      this.logger.error(`Error executing Prometheus query: ${query}`, error.message);
      throw error; // Re-throw to be caught by the calling function
    }
  }
}
