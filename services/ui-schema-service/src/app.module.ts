import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { SchemaModule } from './schema/schema.module';

/**
 * @module AppModule
 * @description The root module for the UI Schema Service.
 *
 * This service is a core component of the "Implement a Schema-Driven UI Rendering Engine"
 * architectural directive. Its primary responsibility is to serve declarative
 * JSON schemas that define the structure, layout, validation rules, and conditional
 * logic for dynamic forms and wizards across the entire frontend ecosystem.
 *
 * This module sets up the foundational infrastructure for the service:
 * - `ConfigModule`: For loading environment variables.
 * - `SchemaModule`: The core feature module containing the logic for retrieving
 *   and serving UI schemas over a RESTful API.
 * - `HealthModule`: A standard module to expose a health check endpoint (e.g., GET /health),
 *   which is essential for container orchestration and monitoring.
 */
@Module({
  imports: [
    // --- Core Infrastructure Modules ---

    // Global configuration module to load environment variables from a .env file.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // --- Feature Modules ---

    // The core feature module that contains the logic for retrieving and serving UI schemas.
    SchemaModule,

    // A simple module to expose a health check endpoint.
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
