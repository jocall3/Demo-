import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { PlaidResolver } from './plaid.resolver';
import { PlaidService } from './plaid.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 12000, // Increased timeout for potentially slow Plaid APIs
      maxRedirects: 5,
    }),
  ],
  controllers: [], // REST controllers are deprecated in favor of GraphQL resolvers
  providers: [PlaidResolver, PlaidService],
  exports: [PlaidService], // Exporting service in case other modules need it
})
export class PlaidModule {}
