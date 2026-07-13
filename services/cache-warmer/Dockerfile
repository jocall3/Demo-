# Dockerfile for the Cache Warmer Service

# ARCHITECTURAL DIRECTIVE: Implement a Multi-Tier (L1/L2) Caching Strategy with a Proactive Cache Warmer Service
# This service is a new, dedicated microservice responsible for proactively populating the L2 (Redis) cache.
# It subscribes to domain event streams from Kafka, computes complex aggregated query results,
# and writes them to the cache before they are ever requested by a client. This reduces latency
# for common, expensive queries.
# This Dockerfile uses a multi-stage build to create a lean, secure, and optimized production image.

# --- Stage 1: Dependencies ---
# This stage installs all npm dependencies. It's cached by Docker and only re-runs
# when package.json or package-lock.json changes, speeding up subsequent builds.
FROM node:26-alpine AS deps

# Set the working directory for the application inside the container.
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files.
COPY package*.json ./

# Install all dependencies using 'npm ci' for a clean, deterministic install from the lock file.
# This includes devDependencies which are required for the build stage.
RUN npm ci

# --- Stage 2: Builder ---
# This stage builds the TypeScript source code into JavaScript and then prunes
# development dependencies to create a clean node_modules directory for the final image.
FROM node:26-alpine AS builder

WORKDIR /usr/src/app

# Copy source code from the host machine.
COPY . .

# Copy the pre-installed dependencies from the 'deps' stage.
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Run the build command defined in package.json (e.g., `nest build`).
# This will compile TypeScript into JavaScript in the 'dist' directory.
RUN npm run build

# Remove development dependencies from node_modules, leaving only what's needed for production.
RUN npm prune --production

# --- Stage 3: Production ---
# This is the final, lean, and secure production image. It only contains the
# compiled application and its pruned production dependencies.
FROM node:26-alpine AS production

# Set the environment to production to enable optimizations in Node.js and libraries.
ENV NODE_ENV=production

# Set the working directory.
WORKDIR /usr/src/app

# The node:alpine images come with a non-root 'node' user. We use this user
# to run the application for better security (principle of least privilege).
USER node

# Copy only the necessary artifacts from the 'builder' stage.
# This includes the pruned node_modules, the compiled 'dist' folder,
# and the package.json files (for metadata).
# The --chown flag ensures the 'node' user owns all application files.
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./

# Expose a port for health checks and Prometheus metrics, even though this is a consumer-driven service.
EXPOSE 8080

# The command to start the application when the container launches.
# This runs the compiled main.js file located in the 'dist' folder using Node.
CMD ["node", "dist/main"]