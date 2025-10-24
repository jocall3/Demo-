# Dockerfile for the AI Agent GraphQL Subgraph Service

# STAGE 1: Development - Install all dependencies
# This stage is used to install both production and development dependencies
# to leverage Docker's layer caching during development and for the build stage.
FROM node:20-alpine AS development

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
# Using package*.json to copy both files if they exist.
COPY package*.json ./

# Install all dependencies. This includes devDependencies needed for building.
RUN npm install

# Copy the rest of the application's source code into the container.
COPY . .

# ---

# STAGE 2: Build - Compile the TypeScript source code
# This stage takes the source code and dependencies from the 'development' stage
# and compiles the TypeScript project into JavaScript.
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy the full source code and installed node_modules from the previous stage.
COPY --from=development /usr/src/app .

# Run the build script defined in package.json (e.g., `nest build`).
# This creates the 'dist' folder with the compiled JavaScript.
RUN npm run build

# ---

# STAGE 3: Production - Create the final, optimized image
# This is the final, lean image that will be deployed. It only contains the
# compiled application and its production dependencies, resulting in a smaller
# and more secure image.
FROM node:20-alpine AS production

# Set the Node environment to 'production' for performance optimizations.
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy the package.json and lockfile to the production stage.
COPY package*.json ./

# Install ONLY production dependencies using `npm ci` for faster, deterministic installs.
# The `--omit=dev` flag ensures devDependencies are not installed.
RUN npm ci --omit=dev

# Copy the compiled application code from the 'build' stage into the 'dist' directory.
COPY --from=build /usr/src/app/dist ./dist

# Expose the port the AI Agent service will run on. This should match the PORT
# environment variable the application is configured to use.
EXPOSE 4004

# The command to start the application when the container launches.
# We execute the compiled main.js file located in the 'dist' folder using Node.
CMD ["node", "dist/main"]
