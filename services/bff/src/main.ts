/**
 * main.ts
 *
 * This is the entry point for the Backend-for-Frontend (BFF) service.
 * It initializes and configures the NestJS application, setting up global middleware,
 * configuration, and starting the server to listen for incoming requests from the frontend.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // Create the NestJS application instance, bootstrapping the AppModule.
  const app = await NestFactory.create(AppModule);

  // Retrieve the ConfigService to access environment variables.
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Set a global prefix for all API routes to '/api'.
  // This namespaces the BFF's endpoints.
  app.setGlobalPrefix('api');

  // Enable Cross-Origin Resource Sharing (CORS).
  // For production, the origin should be restricted to the frontend's domain.
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Apply global validation pipes to all incoming requests.
  // This ensures that all request payloads are validated against their DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators.
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted values are provided.
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes.
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Get the port from environment variables, with a fallback for local development.
  const port = configService.get<number>('PORT') || 3001;

  // Start the application server.
  await app.listen(port);

  // Log a confirmation message that the server is running.
  logger.log(`🚀 BFF Application is running on: http://localhost:${port}/api`);
}

// Execute the bootstrap function to start the application.
bootstrap();
