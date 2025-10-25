package accounts.authz

#
# Default decision is to deny all requests.
#
default allow = false

#
# This policy assumes the input from the service middleware has the following structure:
# {
#   "method": "GET",
#   "path": ["accounts", "<account_id>"],
#   "user": { ... JWT payload ... },
#   "resource": { "owner_id": "<user_id_of_the_account>" } // Provided by the service for ownership checks
#   "body": { ... parsed request body ... }
# }
#

# --- Helper Rules ---

# `has_role` is true if the user's JWT contains the specified role.
has_role(role) {
    some i
    input.user.roles[i] == role
}

# `is_resource_owner` is true if the JWT subject ID matches the owner ID of the resource being accessed.
# This is the core rule for Attribute-Based Access Control (ABAC) in this policy.
is_resource_owner {
	input.user.sub == input.resource.owner_id
}

# --- Global Admin Override ---

# Admins are allowed to perform any action on any resource within this service.
allow {
	has_role("admin")
}

# --- User Rules ---

# Rule: Allow users to retrieve the details of their OWN accounts.
# API Endpoint: GET /accounts/{accountId}
allow {
    has_role("user")
    input.method == "GET"
    count(input.path) == 2
    input.path[0] == "accounts"
    is_resource_owner
}

# Rule: Allow users to list their accounts.
# API Endpoint: GET /accounts
# NOTE: The service itself is responsible for filtering the returned list to only include
# the accounts belonging to the authenticated user. This rule simply grants the permission
# to make the API call itself.
allow {
    has_role("user")
    input.method == "GET"
    input.path == ["accounts"]
}

# Rule: Allow users to create a new account for themselves.
# API Endpoint: POST /accounts
# This rule provides a defense-in-depth check to ensure the userId in the
# request body matches the identity of the user making the request from the JWT.
allow {
    has_role("user")
    input.method == "POST"
    input.path == ["accounts"]
    input.body.userId == input.user.sub
}

# Rule: Allow users to perform state-changing actions (e.g., deposit, withdraw) on their OWN accounts.
# API Endpoints: POST /accounts/{accountId}/deposit, POST /accounts/{accountId}/withdraw, etc.
allow {
    has_role("user")
    input.method == "POST"
    count(input.path) == 3
    input.path[0] == "accounts"
    allowed_actions := {"deposit", "withdraw", "transfer"}
    allowed_actions[input.path[2]]
    is_resource_owner
}
