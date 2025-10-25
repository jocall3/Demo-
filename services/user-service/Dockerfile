# Dockerfile for the User Service GraphQL Subgraph

# STAGE 1: Development - Install all dependencies for building
# We use a specific node version on a lean alpine base to keep the image small.
FROM node:20-alpine AS development

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and lock file to leverage Docker's layer caching
COPY package*.json ./

# Install all dependencies, including devDependencies, which are needed for the build step
RUN npm install

# Copy the rest of the application's source code
COPY . .

# ---

# STAGE 2: Build - Compile the TypeScript source code to JavaScript
# This stage uses the dependencies installed in the previous stage to build the app.
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy the full source code and installed dependencies from the 'development' stage
COPY --from=development /usr/src/app .

# Run the build script defined in package.json (e.g., `nest build`)
RUN npm run build

# ---

# STAGE 3: Production - Create the final, optimized image for deployment
# This is the final, lean image that will be deployed. It only contains the
# compiled application and its production dependencies.
FROM node:20-alpine AS production

# Set the Node environment to 'production' for performance and security optimizations
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package.json and lock file again to install only production dependencies
COPY package*.json ./

# Install ONLY production dependencies using `npm ci` for faster, deterministic installs.
# The `--omit=dev` flag ensures devDependencies are not installed.
RUN npm ci --omit=dev

# Copy the compiled application code from the 'build' stage into the 'dist' directory
COPY --from=build /usr/src/app/dist ./dist

# Expose the port the application will run on. This should match the port
# configured in the service's main.ts or .env file. As per the service's main.ts, default is 4001.
EXPOSE 4001

# The command to start the application when the container launches.
# We execute the compiled main.js file located in the 'dist' folder using Node.
CMD ["node", "dist/main"]
