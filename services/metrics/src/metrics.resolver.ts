import { Query, Resolver, ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { MetricsService } from './metrics.service';
import { Logger } from '@nestjs/common';

// ===============================================================================================
// GRAPHQL SCHEMA DEFINITIONS (Code-First)
// ===============================================================================================
// These enums and object types define the GraphQL schema for the Metrics subgraph.
// They are defined here to be co-located with their resolver but could be moved to a separate file.

/**
 * An enumeration of all external API providers integrated with the system.
 * This is used to identify which service's metrics are being reported.
 */
export enum APIProvider {
  Plaid = 'Plaid',
  Stripe = 'Stripe',
  Marqeta = 'Marqeta',
  ModernTreasury = 'ModernTreasury',
  GoogleGemini = 'GoogleGemini',
}

/**
 * The operational status of an API provider, determined by analyzing its metrics.
 */
export enum APIStatusType {
  Operational = 'Operational',
  DegradedPerformance = 'DegradedPerformance',
  PartialOutage = 'PartialOutage',
  MajorOutage = 'MajorOutage',
}

// Register the enums with NestJS GraphQL so they are included in the generated schema.
registerEnumType(APIProvider, {
  name: 'APIProvider',
});

registerEnumType(APIStatusType, {
  name: 'APIStatusType',
});

@ObjectType({ description: 'Represents the real-time operational status of a downstream API.' })
export class APIStatus {
  @Field(() => APIProvider, { description: 'The name of the external API provider.' })
  provider: APIProvider;

  @Field(() => APIStatusType, { description: 'The current operational status of the provider.' })
  status: APIStatusType;

  @Field(() => Int, { description: 'The recent P95 response time in milliseconds.' })
  responseTime: number;
}

/**
 * GraphQL resolver for the Metrics subgraph.
 *
 * This resolver is responsible for querying backend observability systems (like Prometheus)
 * and exposing structured data about system health and performance through the federated GraphQL API.
 * It owns the `apiStatus` query, providing a unified view of downstream service health, which was
 * previously located in the BFF.
 */
@Resolver()
export class MetricsResolver {
  private readonly logger = new Logger(MetricsResolver.name);

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Retrieves the current operational status of all critical downstream API providers.
   * This query fetches real-time data from Prometheus via the MetricsService to determine
   * the health, latency, and error rate for each configured service.
   *
   * @returns A promise that resolves to an array of APIStatus objects.
   */
  @Query(() => [APIStatus], {
    name: 'apiStatus',
    description: 'Fetches the real-time operational status of all integrated downstream services.',
  })
  async getApiStatuses(): Promise<APIStatus[]> {
    this.logger.log('Resolving apiStatus query by fetching data from Prometheus via MetricsService.');
    return this.metricsService.getApiStatuses();
  }
}
