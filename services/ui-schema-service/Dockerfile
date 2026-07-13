# Dockerfile for the UI Schema Service
#
# ARCHITECTURAL DIRECTIVE: Implement a Schema-Driven UI Rendering Engine
# This service is a new component in the microservices architecture. Its sole responsibility
# is to serve declarative JSON schemas that define the structure, layout, validation rules,
# and conditional logic for all forms and multi-step wizards across the application.
# A generic frontend component will fetch these schemas at runtime to dynamically render UIs.
#
# This Dockerfile uses a multi-stage build to create a lean, optimized, and secure image.

# --- Stage 1: Dependencies ---
# This stage is dedicated to installing npm dependencies. By isolating this step, we
# leverage Docker's layer caching. This layer only gets rebuilt if package.json or
# package-lock.json changes, significantly speeding up subsequent builds.
FROM node:26-alpine AS deps

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package and lock files
COPY package*.json ./

# Install all dependencies using 'npm ci' for a clean, deterministic install from the lock file.
# This includes devDependencies which are required for the build stage.
RUN npm ci

# --- Stage 2: Builder ---
# This stage builds the TypeScript source code into JavaScript and then prunes
# development dependencies to create a clean production-ready node_modules directory.
FROM node:26-alpine AS builder

WORKDIR /usr/src/app

# Copy the application source code
COPY . .

# Copy the pre-installed dependencies from the 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Run the build command defined in package.json (e.g., `nest build`).
# This compiles TypeScript into JavaScript in the 'dist' directory.
RUN npm run build

# Prune development dependencies from node_modules, leaving only what's needed for production.
RUN npm prune --production

# --- Stage 3: Production ---
# This is the final, lean, and secure production image. It contains only the
# compiled application and its pruned production dependencies.
FROM node:26-alpine AS production

# Set the environment to production to enable optimizations in Node.js and frameworks.
ENV NODE_ENV=production

WORKDIR /usr/src/app

# The node:alpine images come with a non-root 'node' user. We switch to this user
# to run the application, adhering to the principle of least privilege for better security.
USER node

# Copy only the necessary artifacts from the 'builder' stage.
# This includes the pruned node_modules, the compiled 'dist' folder, and package.json files.
# The --chown flag ensures the 'node' user owns all application files.
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./

# It is a good practice to expose the port the application will run on within the container.
# The actual port will be mapped during runtime. 8080 is a common choice for containerized services.
EXPOSE 8080

# The command to start the application when the container launches.
# This runs the compiled main.js file located in the 'dist' folder.
CMD ["node", "dist/main"]
