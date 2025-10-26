# Dockerfile for the Plaid Integration Subgraph Service

# --- Stage 1: Development ---
# This stage installs all dependencies (including devDependencies) and copies the source code.
# It's used as a base for the build stage to leverage Docker's layer caching.
FROM node:25-alpine AS development

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock, etc.)
# Using package*.json to copy both files if they exist
COPY package*.json ./

# Install all dependencies required for building the application
RUN npm install

# Copy the rest of the application's source code into the container
COPY . .

# --- Stage 2: Build ---
# This stage takes the source code and dependencies from the 'development' stage
# and builds the production-ready JavaScript files from the TypeScript source.
FROM node:25-alpine AS build

WORKDIR /usr/src/app

# Copy everything from the previous stage
COPY --from=development /usr/src/app .

# Execute the build command defined in package.json (e.g., `nest build`).
RUN npm run build

# --- Stage 3: Production ---
# This is the final, lean production image. It only contains the built application
# and its production dependencies, resulting in a smaller and more secure image.
FROM node:25-alpine AS production

# Set the environment to production to enable optimizations in Node.js and libraries
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package files to install only production dependencies
COPY package*.json ./

# Install ONLY production dependencies using npm ci for faster, deterministic installs
RUN npm ci --omit=dev

# Copy the compiled application from the 'build' stage into the final image
COPY --from=build /usr/src/app/dist ./dist

# Expose the port the application will run on. This should match the port
# configured in the service's main.ts or .env file.
EXPOSE 4004

# The command to start the application when the container launches
CMD ["node", "dist/main"]
