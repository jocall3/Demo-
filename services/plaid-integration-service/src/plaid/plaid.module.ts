import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  PlaidMutationResolver,
  PlaidUserResolver,
  PlaidAccountResolver,
} from './plaid.resolver';
import { PlaidService } from './plaid.service';

/**
 * @module PlaidModule
 * @description Encapsulates all Plaid-related functionality within the Plaid Integration microservice.
 * This module adheres to the Hexagonal Architecture principle by providing a clear boundary
 * between the application core (PlaidService) and external interfaces (GraphQL resolvers).
 *
 * Responsibilities:
 * - Provides access to configuration settings via `ConfigModule`.
 * - Registers and makes injectable the `PlaidService`, which acts as the application service
 *   handling core business logic and interactions with the external Plaid API (an adapter).
 * - Registers and makes injectable GraphQL resolvers (`PlaidMutationResolver`, `PlaidUserResolver`,
 *   `PlaidAccountResolver`) which serve as the API-facing adapters for the federated GraphQL schema.
 * - Exports `PlaidService` to allow other modules within this microservice to utilize its functionality
 *   for event handling or internal operations.
 */
@Module({
  imports: [
    // `ConfigModule` is imported to ensure `ConfigService` can be injected into `PlaidService`
    // for secure retrieval of API keys and environment-specific settings. This aligns
    // with the centralized configuration management directive.
    ConfigModule,
  ],
  providers: [
    // GraphQL resolvers serve as adapters for the external GraphQL interface (Port).
    // They translate incoming GraphQL requests into calls to the core application service.
    PlaidMutationResolver,
    PlaidUserResolver,
    PlaidAccountResolver,
    // `PlaidService` is the core application service for the Plaid domain.
    // It orchestrates interactions with the external Plaid API and manages domain logic,
    // embodying the spirit of Domain-Driven Design and Hexagonal Architecture.
    PlaidService,
  ],
  // `PlaidService` is exported to ensure it is available for other components within this
  // microservice, such as event handlers (e.g., in `PlaidController`) or other internal modules,
  // without breaking encapsulation.
  exports: [PlaidService],
})
export class PlaidModule {}
