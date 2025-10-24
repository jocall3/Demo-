import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { PlaidModule } from './plaid/plaid.module';
import { GenaiModule } from './genai/genai.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigService available throughout the app
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      cache: true, // Improve performance by caching environment variables
    }),
    HealthModule, // For health checks
    AuthModule, // For handling client authentication (e.g., JWT validation)
    PlaidModule, // For interacting with Plaid API
    StripeModule, // For interacting with Stripe API
    GenaiModule, // For interacting with Google GenAI APIs
    AccountsModule, // For aggregating and serving account data
    TransactionsModule, // For aggregating and serving transaction data
  ],
  controllers: [AppController], // Root controller for basic routes/health checks
  providers: [AppService], // Root service
})
export class AppModule {}
