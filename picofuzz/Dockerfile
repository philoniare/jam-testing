# Use Node.js 20 as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm i

# Copy source code
COPY . .

# Install tsx globally for running TypeScript
RUN npm install -g tsx

# Set the entry point
ENTRYPOINT ["tsx", "./index.ts"]

# Default command (can be overridden)
CMD ["--help"]
