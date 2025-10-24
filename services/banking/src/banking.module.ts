import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { join } from 'path';

import { BankingResolver } from './banking.resolver';
import { UsersResolver } from './users.resolver';
import { BankingService } from './banking.service';
import { PlaidService } from './plaid.service';
import { StripeService } from './stripe.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
        path: join(process.cwd(), 'src/schema.gql'),
      },
    }),
    HttpModule,
  ],
  providers: [
    BankingResolver,
    UsersResolver,
    BankingService,
    PlaidService,
    StripeService,
  ],
})
export class BankingModule {}
