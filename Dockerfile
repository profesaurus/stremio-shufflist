# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source code
COPY . .

# Run the build script
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files again
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 7000

CMD ["node", "dist/addon.js"]
