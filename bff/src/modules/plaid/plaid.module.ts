import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlaidResolver } from './plaid.resolver';
import { PlaidService } from './plaid.service';

@Module({
  imports: [ConfigModule],
  providers: [PlaidResolver, PlaidService],
  exports: [PlaidService],
})
export class PlaidModule {}
