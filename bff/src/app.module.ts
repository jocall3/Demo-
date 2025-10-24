import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

// Observability Modules
import { MetricsModule } from './modules/metrics/metrics.module';

// Feature Modules
import { BankingModule } from './modules/banking/banking.module';
import { GenaiModule } from './modules/genai/genai.module';
import { PlaidModule } from './modules/plaid/plaid.module';
import { GeminiModule } from './gemini/gemini.module';

@Module({
  imports: [
    // --- Core Modules ---

    // Global configuration module.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // --- GraphQL Federation Module ---
    // Sets up the GraphQL server as a federated subgraph.
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      // Automatically generate schema from code-first resolvers.
      // Federation 2 is used for compatibility with Apollo Federation v2.
      autoSchemaFile: {
        federation: 2,
      },
    }),

    // --- Observability Modules ---
    MetricsModule, // Exposes a /metrics endpoint for Prometheus scraping.

    // --- Feature Modules ---
    // These modules will be updated to provide GraphQL resolvers.
    BankingModule,
    GenaiModule,
    PlaidModule,
    GeminiModule,
  ],
  controllers: [AppController], // Keeping for root-level health check endpoint.
  providers: [AppService],
})
export class AppModule {}
