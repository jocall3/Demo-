import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetricsResolver } from './metrics.resolver';
import { MetricsService } from './metrics.service';

/**
 * The MetricsModule encapsulates the logic for the metrics subgraph.
 * It provides the necessary resolver and service to expose metrics data,
 * such as API health and performance, via GraphQL. This module will be
 * imported into the root AppModule of the Metrics microservice.
 */
@Module({
  imports: [
    // HttpModule is imported to allow the MetricsService to make outbound
    // HTTP requests to check the health of other services or query data sources like Prometheus.
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  // The resolver handles GraphQL requests, and the service contains the business logic.
  providers: [MetricsResolver, MetricsService],
})
export class MetricsModule {}
