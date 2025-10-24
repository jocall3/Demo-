import { registerAs } from '@nestjs/config';

/**
 * Defines and loads application configuration from environment variables for the API Gateway.
 * This function is registered with NestJS's ConfigModule to provide a structured,
 * typed configuration object for the application.
 */
export default registerAs('config', () => {
  return {
    // Application environment ('development', 'production', 'test', etc.)
    env: process.env.NODE_ENV || 'development',
    isProd: process.env.NODE_ENV === 'production',

    // Port the API Gateway will listen on.
    port: parseInt(process.env.PORT, 10) || 4000,

    // CORS configuration for the frontend application.
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    },

    // Authentication configuration for JWTs issued to clients.
    auth: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },

    // Observability configuration for OpenTelemetry.
    observability: {
      serviceName: process.env.OTEL_SERVICE_NAME || 'api-gateway',
      exporterUrl:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      logLevel: process.env.LOG_LEVEL || 'info',
    },

    // Apollo Gateway configuration for federating GraphQL subgraphs.
    gateway: {
      // A list of all microservice subgraphs to be composed into the supergraph.
      // In a production environment, these URLs would point to the deployed services.
      subgraphs: [
        {
          name: 'users',
          url: process.env.USERS_SERVICE_URL || 'http://localhost:4001/graphql',
        },
        {
          name: 'accounts',
          url: process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:4002/graphql',
        },
        {
          name: 'transactions',
          url: process.env.TRANSACTIONS_SERVICE_URL || 'http://localhost:4003/graphql',
        },
        {
          name: 'ai_agent',
          url: process.env.AI_AGENT_SERVICE_URL || 'http://localhost:4004/graphql',
        },
        {
          name: 'plaid_integration',
          url:
            process.env.PLAID_INTEGRATION_SERVICE_URL ||
            'http://localhost:4005/graphql',
        },
      ],
      // Optional: A shared secret for authenticating requests from the gateway to subgraphs.
      subgraphApiKey: process.env.SUBGRAPH_API_KEY,
    },
  };
});
