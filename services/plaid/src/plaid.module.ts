import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlaidService } from './plaid.service';
import {
  PlaidAccountResolver,
  PlaidMutationResolver,
  PlaidUserResolver,
} from './plaid.resolver';

/**
 * The PlaidModule encapsulates all logic for interacting with the Plaid API.
 *
 * As a feature module within the Plaid microservice, its responsibilities are:
 * - Importing necessary modules, like `ConfigModule` to access environment variables.
 * - Declaring and providing the `PlaidService` which contains the core business logic.
 * - Declaring and providing all GraphQL resolvers related to the Plaid domain, which handle
 *   the API layer for the subgraph.
 * - Exporting the `PlaidService` so it can be used by the resolvers.
 */
@Module({
  // ConfigModule is imported to make ConfigService available for injection.
  // Although ConfigModule is configured as global in the root AppModule,
  // explicitly importing it here makes the module's dependencies clearer.
  imports: [ConfigModule],

  // The service and all related resolvers are registered as providers
  // with Nest's dependency injection system.
  providers: [
    PlaidService,
    PlaidMutationResolver,
    PlaidUserResolver,
    PlaidAccountResolver,
  ],

  // PlaidService is exported to be used by the registered resolvers.
  exports: [PlaidService],
})
export class PlaidModule {}
