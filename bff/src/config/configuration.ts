import { registerAs } from '@nestjs/config';

/**
 * Defines and loads application configuration from environment variables for the API Gateway.
 * This function is registered with NestJS's ConfigModule to provide a structured,
 * typed configuration object for the application, aligning with the new microservices architecture.
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

    // OIDC-compliant authentication configuration.
    // Secrets are placeholders; in production, they'd be fetched from Vault.
    auth: {
      // The URL of the OpenID Connect provider (e.g., Keycloak, Auth0).
      issuer: process.env.OIDC_ISSUER_URL,
      // The audience identifier for the API, used to validate the 'aud' claim in JWTs.
      audience: process.env.OIDC_AUDIENCE,
      // URL for fetching the JSON Web Key Set (JWKS) to verify token signatures.
      jwksUri: `${process.env.OIDC_ISSUER_URL}/.well-known/jwks.json`,
      // Client ID for the Gateway itself, used for token exchange flows.
      clientId: process.env.OIDC_GATEWAY_CLIENT_ID,
      // Path in Vault to fetch the client secret.
      clientSecretPath:
        process.env.OIDC_GATEWAY_CLIENT_SECRET_PATH ||
        'secret/data/demobank/oidc/gateway-client',
    },

    // Configuration for the centralized secrets manager (HashiCorp Vault).
    secrets: {
      address: process.env.VAULT_ADDR,
      // Role used by the service to authenticate with Vault.
      roleId: process.env.VAULT_ROLE_ID,
      // A wrapped secret ID for initial authentication.
      secretId: process.env.VAULT_SECRET_ID,
    },

    // Observability configuration for OpenTelemetry.
    observability: {
      serviceName: process.env.OTEL_SERVICE_NAME || 'api-gateway',
      exporterUrl:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        'http://localhost:4318/v1/traces',
      logLevel: process.env.LOG_LEVEL || 'info',
    },

    // Apollo Gateway configuration for federating GraphQL subgraphs.
    gateway: {
      // A list of all microservice subgraphs to be composed into the supergraph.
      subgraphs: [
        {
          name: 'users',
          url: process.env.USERS_SERVICE_URL || 'http://localhost:4001/graphql',
        },
        {
          name: 'accounts',
          url:
            process.env.ACCOUNTS_SERVICE_URL || 'http://localhost:4002/graphql',
        },
        {
          name: 'transactions',
          url:
            process.env.TRANSACTIONS_SERVICE_URL ||
            'http://localhost:4003/graphql',
        },
        {
          name: 'ai-agent',
          url: process.env.AI_AGENT_SERVICE_URL || 'http://localhost:4004/graphql',
        },
        {
          name: 'plaid-integration',
          url:
            process.env.PLAID_INTEGRATION_SERVICE_URL ||
            'http://localhost:4005/graphql',
        },
      ],
      // Path in Vault to fetch the shared secret for authenticating requests from the gateway to subgraphs.
      subgraphApiKeyPath:
        process.env.SUBGRAPH_API_KEY_PATH ||
        'secret/data/demobank/subgraph-api-key',
    },
  };
});
