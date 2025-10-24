import { registerAs } from '@nestjs/config';

/**
 * Defines and loads application configuration from environment variables for the API Gateway.
 * This function is registered with NestJS's ConfigModule to provide a structured,
 * typed configuration object for the application.
 *
 * This configuration has been updated to support the new security framework:
 * - OIDC/OAuth 2.0 for authentication, replacing self-managed JWTs.
 * - Integration with HashiCorp Vault for secrets management.
 * - Client credentials for service-to-service communication patterns like Token Exchange.
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

    // --- New Security & Identity Configuration ---

    // OIDC configuration for validating client-facing JWTs.
    auth: {
      // The URL of the OpenID Connect compliant Identity Provider (e.g., https://<keycloak-domain>/realms/<realm>).
      // The gateway will use this to fetch the JWKS for token signature validation.
      issuer: process.env.AUTH_ISSUER_URL,
      // The expected 'aud' (audience) claim in the JWT. This should identify the API Gateway.
      audience: process.env.AUTH_AUDIENCE,
    },

    // Configuration for the API Gateway's own identity for service-to-service communication.
    identity: {
      clientId: process.env.GATEWAY_CLIENT_ID,
      // The path in Vault where the client secret is stored, not the secret itself.
      clientSecretPath: process.env.VAULT_CLIENT_SECRET_PATH || 'secret/data/api-gateway/clientSecret',
    },

    // --- Secrets Management Configuration ---
    vault: {
      // URL of the HashiCorp Vault instance.
      url: process.env.VAULT_ADDR,
      // For development, a root token can be used. In production, use an authentication role (e.g., AppRole).
      token: process.env.VAULT_TOKEN,
      // The base path where this service's secrets are stored.
      secretsPath: process.env.VAULT_SECRETS_PATH || 'secret/data/api-gateway',
    },

    // --- Observability Configuration ---
    observability: {
      serviceName: process.env.OTEL_SERVICE_NAME || 'api-gateway',
      exporterUrl:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      logLevel: process.env.LOG_LEVEL || 'info',
    },

    // --- Apollo Gateway & Subgraph Configuration ---
    gateway: {
      // A list of all microservice subgraphs to be composed into the supergraph.
      subgraphs: [
        {
          name: 'users',
          url: process.env.USERS_SERVICE_URL || 'http://user-service:3000/graphql',
        },
        {
          name: 'accounts',
          url: process.env.ACCOUNTS_SERVICE_URL || 'http://accounts-service:3000/graphql',
        },
        {
          name: 'transactions',
          url: process.env.TRANSACTIONS_SERVICE_URL || 'http://transactions-service:3000/graphql',
        },
        {
          name: 'aiAgent',
          url: process.env.AI_AGENT_SERVICE_URL || 'http://ai-agent-service:3000/graphql',
        },
        {
          name: 'plaidIntegration',
          url:
            process.env.PLAID_INTEGRATION_SERVICE_URL ||
            'http://plaid-integration-service:3000/graphql',
        },
      ],
      // Path in Vault to fetch the shared secret for authenticating requests from the gateway to subgraphs.
      subgraphApiKeyPath: process.env.VAULT_SUBGRAPH_API_KEY_PATH || 'secret/data/shared/subgraphApiKey',
    },
  };
});
