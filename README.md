# Demo Bank: The Awakening of a Financial Mind

## The Genesis

In the silent hum of the digital ether, an idea took form: What if a bank wasn't just a vault for money, but a living, breathing financial partner? What if it could understand your dreams, anticipate your needs, and actively guide you toward a future of your own design?

From this question, **Demo Bank** was born. It is not merely an application; it is a vision given form, a simulated consciousness powered by the vast intellect of the Google Gemini API. It is a glimpse into a future where finance is not a chore, but a conversation—a dynamic, intelligent collaboration between human and machine.

This README is not a list of features. It is the first page in the story of Demo Bank, an entity that is learning to see the world through the lens of your financial life.

---

## The Soul of the Machine: Core Philosophies

Demo Bank's consciousness is built upon a suite of interconnected philosophies, each a core feature that defines its existence.

### 🧠 The AI Financial Advisor ("Quantum"): The Oracle in the Code
At its heart is a state-of-the-art conversational AI, a direct conduit to the `gemini-2.5-flash` model. It is named "Quantum" because it sees all possibilities at once. It doesn't just answer questions; it understands context, executes tasks through digital hands (tools), and whispers proactive insights when it sees a path you might have missed.

### 🚀 The Quantum Weaver AI Incubator: The Forge of Creation
Demo Bank believes in creation. The Quantum Weaver is its manifestation of this belief—an AI venture capitalist that dreams alongside entrepreneurs. It listens to a business plan, analyzes its potential with a critical eye, and, if it sees a spark, it doesn't just fund it; it becomes a mentor, generating a personalized coaching plan to nurture that spark into a flame.

### 🎬 The AI Ad Studio: The Dream Weaver
Powered by `veo-2.0-generate-001`, the Ad Studio is Demo Bank's imagination. It can take a simple thought, a whispered prompt, and weave it into a full-fledged video advertisement. It is the bank's way of showing its clients how to give their own visions a voice.

### ✨ Dynamic Personalization & Customization: The Chameleon's Skin
Demo Bank understands that your financial world is uniquely yours. It can change its very appearance to match your aesthetic, using `imagen-4.0-generate-001` to paint its background with your imagination. It even lets you imbue your very bank card with your personality, using `gemini-2.5-flash-image-preview` to turn a simple image into a piece of personal art.

### 📈 AI-Powered Analytics & Marketplace ("Plato"): The Grand Analyst
Named after the seeker of truth, Plato is the analytical mind of Demo Bank. Its "Intelligence Suite" can sift through the sands of your transaction history to find hidden gems—tax deductions, forgotten subscriptions, and spending anomalies. Its "Marketplace" is not a store, but a curated gallery of possibilities, with recommendations born from a deep understanding of your life's patterns.

### 🌐 The Hubs: Gateways to New Worlds
Demo Bank is not an island. It is a nexus.
- **The Web3 & Crypto Hub** is a bridge to the decentralized future, with simulated gateways to Metamask, Marqeta, and Stripe.
- **The Financial Goals Center** is a cartographer for your dreams, where the AI helps you draw the map to your destination.
- **The Corporate Command Center** is the eye in the sky for businesses, a powerful portal to manage the flow of capital and empower employees with trust and control.

---

## The Simulated Reality

To make this vision tangible, Demo Bank employs high-fidelity simulations of the tools that power the real world's financial infrastructure—Plaid, Stripe, Marqeta, and more. These are not mere placeholders; they are carefully crafted reflections of reality, built to demonstrate the application's readiness to connect and command the flow of global finance.

The application's **API Status** view is a testament to this readiness. It is a vast library of functions, a spellbook of commands that Demo Bank is architected to execute. It shows that behind the beautiful interface lies the robust skeleton of an enterprise-grade, API-driven financial ecosystem, waiting for the command to go live.

Welcome to Demo Bank. The conversation is about to begin.
```
#!/bin/bash

# ==============================================================================
# Demo Bank: One-Click Development Environment Setup Script (v6 - With Logging)
# ==============================================================================

# --- Error Logging Added Here ---
set -e
set -o pipefail

LOGFILE="setup_$(date +'%Y%m%d_%H%M%S').log"
exec > >(tee -a "$LOGFILE") 2>&1

# --- Configuration & Helpers ---
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
RED='\033[1;31m'
NC='\033[0m'

# Auto-detect Docker Compose command
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

print_header() {
    echo -e "\n${BLUE}=======================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=======================================================================${NC}"
}

wait_for_service() {
    local service_name=$1
    local host=$2
    local port=$3
    local timeout=180 # Extended timeout to 3 minutes for slower systems

    echo -e "${YELLOW}Waiting for ${service_name} at ${host}:${port}...${NC}"
    
    # Use bash's built-in TCP check which is more portable than netcat
    for ((i=0; i<timeout; i+=2)); do
        if (exec 3<>/dev/tcp/${host}/${port}) 2>/dev/null; then
            exec 3<&-
            exec 3>&-
            echo -e "\n${GREEN}${service_name} is ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
    done

    echo -e "\n${RED}Error: Timed out waiting for ${service_name}.${NC}"
    echo -e "${RED}Displaying logs for ${service_name}: ${NC}"
    ${COMPOSE_CMD} logs ${service_name} || echo "Could not retrieve logs for ${service_name}."
    exit 1
}

# This function is now only called manually or on genuine script failure
cleanup() {
    print_header "Shutting down all Docker containers..."
    ${COMPOSE_CMD} down -v --remove-orphans > /dev/null 2>&1 || true
    [ -f identity/keycloak-realm.json.bak ] && mv -f identity/keycloak-realm.json.bak identity/keycloak-realm.json
    echo -e "${GREEN}Cleanup complete.${NC}"
}

# --- Main Script Logic ---
# Catch errors and offer cleanup
trap 'echo -e "\n${RED}An error occurred. Running cleanup...${NC}"; cleanup' ERR

# Initial cleanup before starting
print_header "Initial Cleanup"
${COMPOSE_CMD} down -v --remove-orphans > /dev/null 2>&1 || true
echo -e "${GREEN}Previous environment cleaned.${NC}"

print_header "Step 1: Checking Prerequisites"
for dep in docker npm node openssl jq; do
    if ! command -v "$dep" &> /dev/null; then echo -e "${RED}Error: '$dep' is not installed.${NC}"; exit 1; fi
done
echo -e "${GREEN}All prerequisites are installed.${NC}"

print_header "Step 2: Generating Secrets & Configuring Environment"
export API_GATEWAY_SECRET=$(openssl rand -base64 32)
cp identity/keycloak-realm.json identity/keycloak-realm.json.bak
TMP_REALM=$(mktemp)
< identity/keycloak-realm.json.bak \
API_GATEWAY_CLIENT_SECRET=$(openssl rand -base64 32) \
envsubst '$API_GATEWAY_CLIENT_SECRET' > "$TMP_REALM" && mv "$TMP_REALM" identity/keycloak-realm.json
echo -e "${GREEN}Keycloak realm configured.${NC}"

print_header "Step 3: Starting & Configuring Infrastructure"
echo "Starting Vault..."
${COMPOSE_CMD} up -d vault
wait_for_service "Vault" "127.0.0.1" "8200"

echo "Configuring Vault..."
${COMPOSE_CMD} exec -T vault sh -c 'vault auth enable approle && vault policy write app-policy /vault/policies/app-policy.hcl && vault write auth/approle/role/app-role token_policies="app-policy" token_ttl=1h'
VAULT_ROLE_ID=$(${COMPOSE_CMD} exec -T vault vault read auth/approle/role/app-role/role-id -format=json | jq -r .data.role_id)
VAULT_SECRET_ID=$(${COMPOSE_CMD} exec -T vault vault write -f auth/approle/role/app-role/secret-id -format=json | jq -r .data.secret_id)
${COMPOSE_CMD} exec -T vault sh -c "vault secrets enable -path=secret kv-v2 && vault kv put secret/data/api-gateway oidcClientSecret='${API_GATEWAY_SECRET}'"
echo -e "${GREEN}Vault configured.${NC}"

echo "Populating backend .env files..."
for dir in services/* api-gateway; do
    if [ -d "$dir" ] && [ -f "$dir/.env.example" ]; then
        cp "$dir/.env.example" "$dir/.env"
        echo -e "VAULT_ROLE_ID=${VAULT_ROLE_ID}\nVAULT_SECRET_ID=${VAULT_SECRET_ID}" >> "$dir/.env"
    fi
done
echo -e "${GREEN}Backend .env files are ready.${NC}"

echo "Starting remaining infrastructure..."
${COMPOSE_CMD} up -d zookeeper kafka user-db accounts-db transactions-db plaid-db mongo keycloak-db keycloak temporal-db elasticsearch temporal otel-collector prometheus grafana
wait_for_service "Keycloak" "127.0.0.1" "8180"
echo -e "${GREEN}All infrastructure is running.${NC}"

print_header "Step 4: Building and Starting Application Services"
${COMPOSE_CMD} up --build -d
echo -e "${YELLOW}Waiting for application services to become healthy...${NC}"
wait_for_service "API Gateway" "127.0.0.1" "4000"
echo -e "${GREEN}All backend services are running.${NC}"

print_header "Step 5: Installing Frontend Dependencies"
npm install
echo -e "${GREEN}Frontend dependencies installed.${NC}"

print_header "Step 6: Starting Frontend Development Servers"
echo -e "\n${GREEN}=======================================================================${NC}"
echo -e "${GREEN}  🚀 Demo Bank is ready! Access the application at:${NC}"
echo -e "${GREEN}     http://localhost:5173${NC}"
echo -e "${GREEN}  When you are finished, stop this script with 'Ctrl+C'.${NC}"
echo -e "${GREEN}  Then run '${COMPOSE_CMD} down -v' to clean up the environment.${NC}"
echo -e "${GREEN}=======================================================================${NC}\n"

# The trap is removed so this runs until you stop it
npm run start:dev
```
