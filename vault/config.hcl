# HashiCorp Vault Server Configuration (config.hcl)
# This configuration is designed for a development environment, likely running in Docker.
# It uses a file backend for persistence and disables TLS for simplicity.

# The `ui` stanza enables the web interface, which is useful for development and demos.
ui = true

# The `storage` stanza configures the storage backend where Vault's data is stored.
# The "file" backend is not recommended for production but is suitable for a single-node dev setup.
# Data will be persisted to the specified path inside the Vault container.
storage "file" {
  path = "/vault/file"
}

# The `listener` stanza configures how Vault listens for API requests.
# This listens on port 8200 on all available network interfaces inside the container.
listener "tcp" {
  address     = "0.0.0.0:8200"
  # TLS is disabled for local development to avoid the need for certificate management.
  # In production, TLS should be enabled and properly configured.
  tls_disable = "true"
}

# The `api_addr` is the address that Vault advertises to clients and other nodes in a cluster.
# This should be the address that clients use to access Vault.
# Using the Docker service name 'vault' and default port 8200.
api_addr = "http://vault:8200"

# The `cluster_addr` is used for communication between Vault nodes in a cluster.
cluster_addr = "http://vault:8201"

# The `telemetry` stanza configures Vault's operational metrics.
# This exposes a /v1/sys/metrics endpoint in a Prometheus-compatible format, aligning
# with the project's existing observability stack.
telemetry {
  prometheus_retention_time = "24h"
  disable_hostname = true
}

# `disable_mlock` prevents Vault from memory-locking its process space.
# This is required in some containerized environments (like Docker) where the container
# may not have the necessary permissions (mlock syscall).
# In production on dedicated hosts, this should be `false`.
disable_mlock = true
