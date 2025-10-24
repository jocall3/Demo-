import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  PlaidMutationResolver,
  PlaidUserResolver,
  PlaidAccountResolver,
} from './plaid.resolver';
import { PlaidService } from './plaid.service';

/**
 * The PlaidModule encapsulates all Plaid-related functionality for this subgraph.
 * It provides the necessary resolvers for the GraphQL schema and the PlaidService
 * that contains the core business logic for interacting with the Plaid API.
 */
@Module({
  imports: [
    // ConfigModule is imported to make the ConfigService available for injection
    // into the PlaidService, which needs it for API keys and environment settings.
    ConfigModule,
  ],
  providers: [
    // The resolvers are the entry points for GraphQL operations. This module provides
    // all resolvers related to the Plaid domain.
    PlaidMutationResolver,
    PlaidUserResolver,
    PlaidAccountResolver,
    // The PlaidService is the core logic layer that interacts with the Plaid API.
    PlaidService,
  ],
  // The PlaidService is exported in case it needs to be used by other modules
  // within this same microservice in the future.
  exports: [PlaidService],
})
export class PlaidModule {}
