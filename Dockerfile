# Multi-stage build for ANTLR4 Lab Next

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Production image with Node.js and Java
FROM node:20-alpine

# Install Java runtime for ANTLR
RUN apk add --no-cache openjdk17-jre

WORKDIR /app

# Copy package files and install dependencies (need tsx for server)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy the backend server
COPY server ./server

# Copy the built frontend
COPY --from=builder /app/dist ./dist

# Copy ANTLR jar and required source files for the backend
COPY lib ./lib
COPY src/utils/antlr ./src/utils/antlr
COPY tsconfig.json ./

# Install serve for static file serving
RUN npm install -g serve

# Expose ports
EXPOSE 3000 3001

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start both frontend static server and backend API
CMD ["sh", "-c", "serve -s dist -l 3000 & npx tsx server/index.ts"]
