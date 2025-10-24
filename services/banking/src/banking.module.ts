import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import { BankingResolver } from './banking.resolver';
import { UsersResolver } from './users.resolver';
import { BankingService } from './banking.service';
import { PlaidService } from './plaid.service';
import { StripeService } from './stripe.service';

/**
 * The feature module for the Banking domain.
 * This module encapsulates all banking-related providers (services, resolvers)
 * and is imported by the root AppModule of the banking microservice.
 * It has been refactored to remove root-level configurations (like GraphQLModule.forRoot)
 * which are now handled by the main AppModule.
 */
@Module({
  imports: [
    // Import ConfigModule to be able to inject ConfigService into providers.
    // The .forRoot() configuration is done in the root AppModule.
    ConfigModule,
    // HttpModule is required by PlaidService and other services that make outbound HTTP calls.
    HttpModule,
  ],
  providers: [
    // GraphQL resolvers that expose banking data.
    BankingResolver,
    // Resolver for extending the federated User entity.
    UsersResolver,
    // Core services containing business logic.
    BankingService,
    PlaidService,
    StripeService,
  ],
  // Export services that might be used by other modules within this microservice.
  exports: [BankingService, PlaidService, StripeService],
})
export class BankingModule {}
