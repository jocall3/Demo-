import { Logger } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { MetricsService } from './metrics.service';

/**
 * GraphQL resolver for the Metrics subgraph.
 *
 * This resolver exposes application metrics via the GraphQL API, aligning with
 * the architecture's "GraphQL-first" principle by deprecating the traditional REST /metrics endpoint.
 */
@Resolver()
export class MetricsResolver {
  private readonly logger = new Logger(MetricsResolver.name);

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Retrieves all registered application metrics in the Prometheus exposition format.
   * While typically scraped directly, exposing this via GraphQL allows for introspection
   * and unified access through the supergraph.
   *
   * @returns A promise that resolves to a string containing metrics in Prometheus format.
   */
  @Query(() => String, {
    name: 'prometheusMetrics',
    description:
      'Provides application metrics in the Prometheus exposition format.',
  })
  async prometheusMetrics(): Promise<string> {
    this.logger.log('Serving Prometheus metrics via GraphQL query.');
    return this.metricsService.getMetrics();
  }
}
