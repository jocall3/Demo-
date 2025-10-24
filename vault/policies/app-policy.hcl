# ==============================================================================
# Vault Policy: app-policy
# ==============================================================================
# Description: This policy grants the necessary permissions for DemoBank
# application services (e.g., API Gateway, User Service, etc.) to securely
# access secrets and utilize Vault's capabilities as required by the new
# security framework.
# ==============================================================================

# --- Token Self-Management ---
# These stanzas are best practice, allowing a token to manage its own lifecycle
# without needing broader permissions.

# Allow tokens to look up their own properties and capabilities.
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# Allow tokens to renew their own lease, extending their TTL.
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Allow tokens to revoke their own lease when they are no longer needed.
path "auth/token/revoke-self" {
  capabilities = ["update"]
}


# --- Key/Value v2 Secrets Engine ---
# Grant read-only access to the KV v2 secrets engine mounted at 'secret/'.
# The 'data/' subpath is required for the KV v2 API.

# Grant access to shared secrets common to all services (e.g., message bus credentials).
path "secret/data/demobank/shared" {
  capabilities = ["read"]
}

# Grant read access to service-specific secrets. In a more granular setup, each
# service would have its own policy. This policy is for a shared 'app' role.
path "secret/data/demobank/api-gateway"         { capabilities = ["read"] }
path "secret/data/demobank/user-service"          { capabilities = ["read"] }
path "secret/data/demobank/accounts-service"      { capabilities = ["read"] }
path "secret/data/demobank/transactions-service"  { capabilities = ["read"] }
path "secret/data/demobank/ai-agent-service"      { capabilities = ["read"] }
path "secret/data/demobank/plaid-integration-service" { capabilities = ["read"] }
path "secret/data/demobank/identity-service"      { capabilities = ["read"] }


# --- Database Secrets Engine (Dynamic Credentials) ---
# Grant permission to read dynamic, time-limited credentials from the database
# secrets engine. Each service should have a unique role configured in Vault
# that maps to specific database permissions.

path "database/creds/user-service-role" {
    capabilities = ["read"]
}

path "database/creds/accounts-service-role" {
    capabilities = ["read"]
}

path "database/creds/transactions-service-role" {
    capabilities = ["read"]
}


# --- Transit Secrets Engine (Encryption as a Service) ---
# Grant permissions for services to use the transit engine for encrypting and
# decrypting sensitive data without having access to the encryption keys themselves.
# This is crucial for securely handling data like Plaid access tokens.

# Allow encrypting data using the 'demobank-key'.
path "transit/encrypt/demobank-key" {
  capabilities = ["update"]
}

# Allow decrypting data that was encrypted with the 'demobank-key'.
path "transit/decrypt/demobank-key" {
  capabilities = ["update"]
}
