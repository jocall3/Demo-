import { registerAs } from '@nestjs/config';

/**
 * Defines and loads application configuration from environment variables.
 * This function is registered with NestJS's ConfigModule to provide
 * a structured, typed configuration object for the application. In its
 * current phase of the architectural transformation, this BFF is acting
 * as a federated subgraph, containing the business logic that will eventually
 * be broken out into separate microservices.
 */
export default registerAs('config', () => {
  return {
    // Application environment ('development', 'production', 'test', etc.)
    env: process.env.NODE_ENV || 'development',
    isProd: process.env.NODE_ENV === 'production',

    // Port the subgraph will listen on
    port: parseInt(process.env.PORT, 10) || 3001,

    // CORS configuration for allowing requests from the frontend
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    },

    // Configuration for external services this subgraph depends on
    plaid: {
      clientId: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      env: process.env.PLAID_ENV || 'sandbox',
    },
    google: {
      geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publicKey: process.env.STRIPE_PUBLIC_KEY,
    },

    // JWT configuration for potential authentication/authorization logic within the subgraph
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },

    // Observability configuration for OpenTelemetry
    observability: {
      // Service name for traces, logs, and metrics, updated for the subgraph role.
      serviceName: process.env.OTEL_SERVICE_NAME || 'bff-subgraph',
      // OTLP exporter endpoint (URL of the OpenTelemetry Collector).
      exporterUrl:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
      // Log level for structured logging.
      logLevel: process.env.LOG_LEVEL || 'info',
    },
  };
});
