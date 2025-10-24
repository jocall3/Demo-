import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

// Observability Modules for Tracing, Metrics, and Logging
import { ObservabilityModule } from './observability/observability.module';
import { PrometheusModule } from './prometheus/prometheus.module';

// Feature Modules
import { BankingModule } from './modules/banking/banking.module';
import { GenaiModule } from './modules/genai/genai.module';
import { PlaidModule } from './modules/plaid/plaid.module';
import { GeminiModule } from './gemini/gemini.module';

@Module({
  imports: [
    // --- Core Modules ---

    // Global configuration module using a typed configuration file.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // --- Observability Modules ---

    // Sets up OpenTelemetry for distributed tracing and structured logging.
    ObservabilityModule,
    // Exposes a /metrics endpoint for Prometheus scraping.
    PrometheusModule.forRoot(),

    // --- Feature Modules ---

    // Modules based on the existing file structure.
    BankingModule,
    GenaiModule,
    PlaidModule,
    GeminiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
