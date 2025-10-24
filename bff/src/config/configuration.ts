import { registerAs } from '@nestjs/config';

/**
 * Defines and loads application configuration from environment variables.
 * This function is registered with NestJS's ConfigModule to provide
 * a structured, typed configuration object for the application in its role
 * as a GraphQL Federation Gateway.
 */
export default registerAs('config', () => {
  return {
    // Application environment ('development', 'production', 'test', etc.)
    env: process.env.NODE_ENV || 'development',
    isProd: process.env.NODE_ENV === 'production',

    // Port the gateway will listen on
    port: parseInt(process.env.PORT, 10) || 3001,

    // CORS configuration for the frontend application
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    },

    // Observability configuration for OpenTelemetry
    observability: {
      // Service name for traces, logs, and metrics, updated for the gateway role.
      serviceName: process.env.OTEL_SERVICE_NAME || 'api-gateway',
      // OTLP exporter endpoint (URL of the OpenTelemetry Collector).
      exporterUrl:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
      // Log level for structured logging.
      logLevel: process.env.LOG_LEVEL || 'info',
    },

    // Apollo Gateway configuration for federating subgraphs
    gateway: {
      // A list of subgraphs to be composed into the supergraph.
      // In a production environment, these URLs would point to the deployed services.
      subgraphs: [
        {
          name: 'banking',
          url:
            process.env.BANKING_SUBGRAPH_URL || 'http://localhost:4001/graphql',
        },
        {
          name: 'genai',
          url: process.env.GENAI_SUBGRAPH_URL || 'http://localhost:4002/graphql',
        },
      ],
      // Optional: A shared secret for authenticating requests from the gateway to subgraphs.
      subgraphApiKey: process.env.SUBGRAPH_API_KEY,
    },
  };
});
