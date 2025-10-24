import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { BankingResolver } from './banking.resolver';
import { BankingService } from './banking.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 8000, // Increased timeout for potentially slow banking APIs
      maxRedirects: 5,
    }),
  ],
  controllers: [], // REST controllers are deprecated in favor of GraphQL resolvers
  providers: [BankingResolver, BankingService],
  exports: [BankingService], // Exporting service in case other modules need it
})
export class BankingModule {}
