# Dockerfile for the API Gateway Service
# This Dockerfile is optimized for build performance, security, and small image size
# using multi-stage builds.

# --- Stage 1: Dependencies ---
# This stage is dedicated to installing npm dependencies based on the lock file.
# It leverages Docker's layer caching, so dependencies are only re-installed when
# package.json or package-lock.json changes, making subsequent builds much faster.
FROM node:20-alpine AS deps

# Set the working directory for the application
WORKDIR /usr/src/app

# Copy the package.json and lock file
COPY package*.json ./

# Install all dependencies using 'npm ci' for a clean, deterministic install from the lock file.
# This includes devDependencies which are required for the build stage.
RUN npm ci

# --- Stage 2: Builder ---
# This stage builds the TypeScript source code into JavaScript and then prunes
# development dependencies to prepare a clean node_modules directory for the final image.
FROM node:20-alpine AS builder

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
# This is the final, lean, and secure production image. It only contains the
# compiled application and its pruned production dependencies.
FROM node:20-alpine AS production

# Set the environment to production to enable optimizations in Node.js and libraries.
ENV NODE_ENV=production

# Set the working directory
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

# Expose the port the application will run on.
# This should match the PORT environment variable the application is configured to use.
EXPOSE 4000

# The command to start the application when the container launches.
CMD ["node", "dist/main"]
