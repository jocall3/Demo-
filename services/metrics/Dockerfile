# Stage 1: Install dependencies
# We use a specific node version on a lean alpine base to keep the image small.
# Naming this stage 'development' for clarity.
FROM node:20-alpine AS development

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
# Using package*.json to copy both files if they exist
COPY package*.json ./

# Install all dependencies, including devDependencies, needed for building
RUN npm install

# Copy the rest of the application source code
COPY . .

# ---

# Stage 2: Build the application
# This stage takes the source code and dependencies and builds the production-ready JS files.
# Naming this stage 'build'
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy the source code and dependencies from the previous stage
COPY --from=development /usr/src/app .

# Build the TypeScript project
RUN npm run build

# ---

# Stage 3: Production image
# This is the final, optimized image that will be deployed.
# It only contains the built application and its production dependencies.
FROM node:20-alpine AS production

# Set the node environment to production
ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy the package files
COPY package*.json ./

# Install ONLY production dependencies using npm ci for faster, more reliable installs
RUN npm ci --omit=dev

# Copy the built application from the 'build' stage
COPY --from=build /usr/src/app/dist ./dist

# The default port for a NestJS application is 3000
EXPOSE 3000

# Command to run the application
# We run the compiled main.js file in the dist folder
CMD ["node", "dist/main"]
