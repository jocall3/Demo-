# Dockerfile for the Transactions GraphQL Subgraph Service

# STAGE 1: Development - Install dependencies and copy source
# Use a specific node version on a lean alpine base to keep the image small.
# Naming this stage 'development' for clarity.
FROM node:20-alpine AS development

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
# Using package*.json to copy both files if they exist.
COPY package*.json ./

# Install all dependencies, including devDependencies, which are required for the build process.
RUN npm install

# Copy the rest of the application's source code into the container.
COPY . .

# ---

# STAGE 2: Build - Compile the TypeScript source code to JavaScript
# This stage takes the source code from the 'development' stage and builds the production-ready JS files.
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy the full source code and installed dependencies from the previous stage.
COPY --from=development /usr/src/app .

# Run the build script defined in package.json (e.g., `nest build`).
RUN npm run build

# ---

# STAGE 3: Production - Create the final, optimized image for deployment
# This is the final, lean image that will be deployed.
# It only contains the built application and its production dependencies.
FROM node:20-alpine AS production

# Set the Node environment to 'production' for performance and security optimizations.
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy the package files to install only production dependencies
COPY package*.json ./

# Install ONLY production dependencies using `npm ci` for faster, deterministic installs.
# The `--omit=dev` flag ensures devDependencies are not installed.
RUN npm ci --omit=dev

# Copy the compiled application code from the 'build' stage into the 'dist' directory.
COPY --from=build /usr/src/app/dist ./dist

# Expose the port the application will run on. The Transactions service will run on 4003.
EXPOSE 4003

# The command to start the application when the container launches
# We execute the compiled main.js file located in the 'dist' folder using Node.
CMD ["node", "dist/main"]
