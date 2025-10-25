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
    /**
     * The application environment ('development', 'production', 'test', etc.)
     * @type {string}
     */
    env: process.env.NODE_ENV || 'development',
    /**
     * A boolean flag indicating if the application is in production mode.
     * @type {boolean}
     */
    isProd: process.env.NODE_ENV === 'production',

    /**
     * The port on which the API Gateway will listen for incoming requests.
     * @type {number}
     */
    port: parseInt(process.env.PORT, 10) || 4000,

    /**
     * CORS configuration for the frontend application.
     * @type {{origin: string}}
     */
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    },

    // --- Security & Identity Configuration (OIDC / OAuth 2.0) ---

    /**
     * OIDC configuration for validating client-facing JWTs from the Identity Provider.
     */
    auth: {
      /**
       * The URL of the OpenID Connect compliant Identity Provider (e.g., https://<keycloak-domain>/realms/<realm>).
       * The gateway uses this to fetch the JWKS for token signature validation.
       * @type {string}
       */
      issuer: process.env.OIDC_ISSUER_URL,
      /**
       * The expected 'aud' (audience) claim in the JWT. This should uniquely identify the API Gateway.
       * @type {string}
       */
      audience: process.env.OIDC_AUDIENCE,
    },

    /**
     * Configuration for the API Gateway's own identity, used for service-to-service communication (e.g., Token Exchange).
     */
    identity: {
      /**
       * The OIDC Client ID for the API Gateway itself.
       * @type {string}
       */
      clientId: process.env.OIDC_CLIENT_ID,
      /**
       * The path in Vault where the OIDC client secret is stored, not the secret itself.
       * @type {string}
       */
      clientSecretPath:
        process.env.VAULT_OIDC_CLIENT_SECRET_PATH || 'secret/data/api-gateway/oidcClientSecret',
    },

    // --- Secrets Management Configuration (HashiCorp Vault) ---
    vault: {
      /**
       * The URL of the HashiCorp Vault instance.
       * @type {string}
       */
      url: process.env.VAULT_ADDR,
      /**
       * The Vault token for authentication, typically used for local development.
       * @type {string}
       */
      token: process.env.VAULT_TOKEN,
      /**
       * The Role ID for Vault's AppRole authentication, used in production.
       * @type {string}
       */
      roleId: process.env.VAULT_ROLE_ID,
      /**
       * The Secret ID for Vault's AppRole authentication, used in production.
       * @type {string}
       */
      secretId: process.env.VAULT_SECRET_ID,
      /**
       * The base path in Vault where this service's secrets are stored.
       * @type {string}
       */
      secretsPath: process.env.VAULT_SECRET_PATH || 'secret/data/api-gateway',
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
      /**
       * A list of all microservice subgraphs to be composed into the supergraph.
       * Fallback URLs are provided for local development convenience.
       */
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
          name: 'aiAgent',
          url: process.env.AI_AGENT_SERVICE_URL || 'http://localhost:4004/graphql',
        },
        {
          name: 'plaidIntegration',
          url:
            process.env.PLAID_INTEGRATION_SERVICE_URL ||
            'http://localhost:4005/graphql',
        },
      ],
      /**
       * Path in Vault to fetch the shared secret for authenticating requests from the gateway to subgraphs.
       * This complements mTLS at the network layer.
       * @type {string}
       */
      subgraphApiKeyPath:
        process.env.VAULT_SUBGRAPH_API_KEY_PATH || 'secret/data/shared/subgraphApiKey',
    },
  };
});
