# Dockerfile for the API Gateway Service

# --- Stage 1: Development --- 
# This stage installs all dependencies (including devDependencies) and copies the source code.
# It's used as a base for the build stage to leverage Docker's layer caching.
FROM node:20-alpine AS development

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json.
# Using package*.json to copy both files if they exist.
COPY package*.json ./

# Install all dependencies required for building the application.
RUN npm install

# Copy the rest of the application's source code into the container.
COPY . .

# --- Stage 2: Build --- 
# This stage takes the source code and dependencies from the 'development' stage
# and builds the production-ready JavaScript files from the TypeScript source.
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy everything from the previous stage.
COPY --from=development /usr/src/app .

# Execute the build command defined in package.json (e.g., `nest build`).
RUN npm run build

# --- Stage 3: Production --- 
# This is the final, lean production image. It only contains the built application
# and its production dependencies, resulting in a smaller and more secure image.
FROM node:20-alpine AS production

# Set the environment to production to enable optimizations in Node.js and libraries.
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package files to install only production dependencies.
COPY package*.json ./

# Install ONLY production dependencies using `npm ci` for faster, deterministic installs.
# The `--omit=dev` flag ensures devDependencies are not installed.
RUN npm ci --omit=dev

# Copy the compiled application from the 'build' stage into the 'dist' directory.
COPY --from=build /usr/src/app/dist ./dist

# Expose the port the application will run on. The API Gateway will run on 4000.
EXPOSE 4000

# The command to start the application when the container launches.
# This runs the compiled main.js file located in the 'dist' folder using Node.
CMD ["node", "dist/main"]