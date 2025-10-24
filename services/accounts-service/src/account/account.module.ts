import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountResolver } from './account.resolver';
import { AccountService } from './account.service';
import { PlaidService } from './plaid.service';
import { Account } from './entities/account.entity';
import { PlaidItem } from './entities/plaid-item.entity';

/**
 * The AccountModule encapsulates all logic related to financial accounts.
 * As part of the Accounts microservice, this module is responsible for:
 * - Resolving GraphQL queries and mutations related to accounts.
 * - Interacting with the Plaid API via the PlaidService to fetch account data.
 * - Managing persistence of account and Plaid item data in the database.
 */
@Module({
  imports: [
    ConfigModule, // Provides access to environment variables for configuration.
    HttpModule.register({
      timeout: 10000, // Set a 10-second timeout for external API calls.
      maxRedirects: 5,
    }),
    // Register the entities this module is responsible for with TypeORM.
    TypeOrmModule.forFeature([Account, PlaidItem]),
  ],
  providers: [
    AccountResolver, // Handles GraphQL API requests.
    AccountService, // Contains the core business logic for accounts.
    PlaidService, // Encapsulates communication with the Plaid API.
  ],
  exports: [AccountService], // Export the service for use in other modules if needed.
})
export class AccountModule {}
