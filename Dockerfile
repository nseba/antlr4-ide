# Multi-stage build for ANTLR4 IDE

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

# Create non-root user for security
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -h /app -D appuser

WORKDIR /app

# Create data directory with proper permissions
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

# Declare volume for persistent data
VOLUME /app/data

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

# Set ownership for all app files
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# =============================================================================
# Environment Variables
# =============================================================================

# Server configuration
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

# AI Assistant Configuration
# All AI configuration is server-side. The client has no knowledge of
# providers, models, or API keys.

# AI Provider: 'anthropic', 'openai', or 'gemini' (default: anthropic)
ENV AI_PROVIDER=anthropic

# Model ID - uses sensible defaults per provider if not set
# Anthropic: claude-sonnet-4-20250514, claude-3-5-sonnet-20241022, claude-3-haiku-20240307
# OpenAI: gpt-4o, gpt-4o-mini, gpt-3.5-turbo
# Gemini: gemini-1.5-pro, gemini-1.5-flash
# ENV AI_MODEL=claude-sonnet-4-20250514

# Generation parameters (optional)
# ENV AI_MAX_TOKENS=2048
# ENV AI_TEMPERATURE=0.7

# API Key - set at runtime via docker run -e or docker-compose
# Only the key for your selected AI_PROVIDER needs to be set
# ENV ANTHROPIC_API_KEY=
# ENV OPENAI_API_KEY=
# ENV GEMINI_API_KEY=

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start both frontend static server and backend API
CMD ["sh", "-c", "serve -s dist -l 3000 & npx tsx server/index.ts"]
