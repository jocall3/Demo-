import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { BankingController } from './banking.controller';
import { BankingService } from './banking.service';
import { PlaidService } from './services/plaid.service';
import { StripeService } from './services/stripe.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 8000, // Increased timeout for potentially slow banking APIs
      maxRedirects: 5,
    }),
  ],
  controllers: [BankingController],
  providers: [BankingService, PlaidService, StripeService],
  exports: [BankingService], // Exporting service in case other modules need it
})
export class BankingModule {}
