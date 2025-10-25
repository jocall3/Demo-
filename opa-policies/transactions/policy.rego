package transactions

import future.keywords.in

#
# OPA Policy for the Transactions Microservice
#
# This policy defines the authorization rules for accessing the transactions-service endpoints.
# It is evaluated by an OPA sidecar on every incoming request to the service.
# The decision is based on the request's method, path, and the user's JWT claims.
#
# Architectural Directive: Externalize Authorization Logic with an Open Policy Agent (OPA) Sidecar Framework.
#

# By default, all requests are denied unless explicitly allowed by one of the rules below.
default allow = false

# -----------------------------------------------------------------------------
# Allow Rules: `allow` is true if ANY of the following rules are satisfied.
# -----------------------------------------------------------------------------

# 1. Allow unauthenticated requests to the health check endpoint.
allow {
    input.method == "GET"
    input.path == ["healthz"] # 'healthz' is a common Kubernetes convention
}

# 2. Allow any action for users with the 'admin' role for administrative purposes.
allow {
    is_admin
}

# 3. Allow authenticated standard users to read transactions.
# The service layer is responsible for ensuring that users can only see their own transactions.
# This rule allows GET requests to /transactions and /transactions/{id}.
allow {
    is_user
    input.method == "GET"
    is_transactions_path
}

# 4. Allow authenticated standard users to create new transactions (e.g., initiate payments).
# The service layer is responsible for validating ownership of the source account in the request body.
allow {
    is_user
    input.method == "POST"
    input.path == ["transactions"]
}


# -----------------------------------------------------------------------------
# Helper Rules: Reusable logic for evaluating conditions.
# -----------------------------------------------------------------------------

# Check if the user has the 'admin' role from the JWT claims.
is_admin {
    "admin" in get_roles
}

# Check if the user has the 'user' role from the JWT claims.
is_user {
    "user" in get_roles
}

# Safely get roles from the JWT payload. This handles different potential locations for
# roles claims (e.g., a direct `roles` array or Keycloak's nested `realm_access.roles`).
get_roles = r {
    r := input.user.roles
} else = r {
    r := input.user.realm_access.roles
} else = []

# Checks if the request path targets the transactions resource collection or a specific item.
# e.g., /transactions or /transactions/txn-12345
is_transactions_path {
    input.path[0] == "transactions"
    count(input.path) <= 2
}

# --- Example Input Data Structure (for testing with 'opa eval') ---
# {
#   "method": "GET",
#   "path": ["transactions", "txn-12345"],
#   "user": {
#     "sub": "user-uuid-abc-123",
#     "roles": ["user"]
#   }
# }
