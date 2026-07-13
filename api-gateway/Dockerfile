# Dockerfile for the API Gateway Service
# This Dockerfile is optimized for build performance, security, and small image size
# using a multi-stage build process. It aligns with best practices for containerizing
# Node.js/TypeScript applications.

# --- Stage 1: Dependencies ---
# This stage is dedicated to installing all npm dependencies (including devDependencies)
# based on the lock file. It leverages Docker's layer caching, so dependencies are only
# re-installed when package.json or package-lock.json changes, speeding up subsequent builds.
FROM node:26-alpine AS deps

# Set the working directory for the application.
WORKDIR /usr/src/app

# Copy the package.json and lock file.
COPY package*.json ./

# Install all dependencies using 'npm ci' for a clean, deterministic install from the lock file.
# devDependencies are included here because they are required for the build stage.
RUN npm ci

# --- Stage 2: Builder ---
# This stage builds the TypeScript source code into production-ready JavaScript.
# Its primary artifact is the 'dist' directory.
FROM node:26-alpine AS builder

WORKDIR /usr/src/app

# Copy the full node_modules directory from the 'deps' stage.
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy the rest of the application's source code.
COPY . .

# Run the build command defined in package.json (e.g., `nest build`).
# This compiles TypeScript into JavaScript in the 'dist' directory.
RUN npm run build

# --- Stage 3: Production ---
# This is the final, lean, and secure production image. It only contains the
# compiled application and its production dependencies.
FROM node:26-alpine AS production

# Set the environment to production to enable optimizations in Node.js and libraries.
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package files again to install only production dependencies in a clean node_modules folder.
COPY package*.json ./

# Install ONLY production dependencies. The `--omit=dev` flag ensures no devDependencies are installed,
# resulting in a smaller and more secure node_modules directory.
RUN npm ci --omit=dev

# The node:alpine images come with a non-root 'node' user. We use this user
# to run the application for better security (principle of least privilege).
USER node

# Copy only the compiled application artifacts from the 'builder' stage.
# The --chown flag ensures the 'node' user owns all application files.
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist

# Expose the port the application will run on.
# This should match the PORT environment variable the application is configured to use.
EXPOSE 4000

# The command to start the application when the container launches.
CMD ["node", "dist/main"]
