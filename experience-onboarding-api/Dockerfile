# Dockerfile for the Experience Onboarding API Service
# This Dockerfile is optimized for build performance, security, and small image size
# using multi-stage builds, consistent with other services in the architecture.

# --- Stage 1: Dependencies ---
# This stage installs npm dependencies. It's cached and only re-runs when
# package.json or package-lock.json changes, speeding up subsequent builds.
FROM node:26-alpine AS deps

# Set the working directory for the application
WORKDIR /usr/src/app

# Copy the package.json and lock file
# (Assuming the Docker build context is the 'experience-onboarding-api' directory)
COPY package*.json ./

# Install all dependencies using 'npm ci' for a clean, deterministic install from the lock file.
RUN npm ci

# --- Stage 2: Builder ---
# This stage builds the TypeScript source code into JavaScript and prepares
# production-only node_modules.
FROM node:26-alpine AS builder

WORKDIR /usr/src/app

# Copy source code from the host machine
COPY . .

# Copy dependencies from the 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Run the build command defined in package.json (e.g., `nest build`).
# This will compile TypeScript into JavaScript in the 'dist' directory.
RUN npm run build

# Remove development dependencies from node_modules, leaving only what's needed for production.
RUN npm prune --production

# --- Stage 3: Production ---
# This is the final, lean, and secure production image. It contains only the
# compiled application and its production dependencies.
FROM node:26-alpine AS production

# Set the environment to production to enable optimizations in Node.js and libraries.
ENV NODE_ENV=production

# Set the working directory
WORKDIR /usr/src/app

# The node:alpine images come with a non-root 'node' user. We use this user
# to run the application for better security (principle of least privilege).
USER node

# Copy only the necessary artifacts from the 'builder' stage.
# This includes the pruned node_modules, the compiled 'dist' folder,
# and package.json files (for metadata).
# The --chown flag ensures the 'node' user owns all application files.
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./

# Expose the port the application will run on.
# Assigning a new port for this experience API to avoid conflicts.
EXPOSE 4010

# The command to start the application when the container launches.
CMD ["node", "dist/main"]