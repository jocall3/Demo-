# ==============================================================================
# Vault Policy: app-policy
# ==============================================================================
# Description: This policy grants the necessary permissions for DemoBank
# application services (e.g., API Gateway, User Service, etc.) to securely
# access secrets and utilize Vault's capabilities as required by the new
# security framework. This is a general policy for a shared 'app' AppRole.
# ==============================================================================

# --- Token Self-Management ---
# Allows a token to manage its own lifecycle without needing broader permissions.
# This is a security best practice.

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

# Grant access to secrets shared across all services (e.g., Kafka credentials, shared API keys).
path "secret/data/shared/*" {
  capabilities = ["read"]
}

# Grant read access to service-specific secrets.
path "secret/data/api-gateway/*" {
  capabilities = ["read"]
}
path "secret/data/user-service/*" {
  capabilities = ["read"]
}
path "secret/data/accounts-service/*" {
  capabilities = ["read"]
}
path "secret/data/transactions-service/*" {
  capabilities = ["read"]
}
path "secret/data/ai-agent-service/*" {
  capabilities = ["read"]
}
path "secret/data/plaid-integration-service/*" {
  capabilities = ["read"]
}


# --- Database Secrets Engine (Dynamic Credentials) ---
# Grant permission to read dynamic, time-limited credentials from the database
# secrets engine. Each service has a unique role in Vault that maps to
# specific database permissions.

path "database/creds/user-service-role" {
  capabilities = ["read"]
}

path "database/creds/accounts-service-role" {
  capabilities = ["read"]
}

path "database/creds/transactions-service-role" {
  capabilities = ["read"]
}

path "database/creds/plaid-integration-service-role" {
  capabilities = ["read"]
}


# --- Transit Secrets Engine (Encryption as a Service) ---
# Grant permissions for services to use the transit engine for encrypting and
# decrypting sensitive data without having direct access to the encryption keys.
# This is crucial for securely handling data like Plaid access tokens.

# Allow encrypting data using the 'demobank-key'.
path "transit/encrypt/demobank-key" {
  capabilities = ["update"]
}

# Allow decrypting data that was encrypted with the 'demobank-key'.
path "transit/decrypt/demobank-key" {
  capabilities = ["update"]
}
