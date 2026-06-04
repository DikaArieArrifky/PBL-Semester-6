# Multi-stage build untuk production-optimized image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init untuk proper signal handling
RUN apk add --no-cache dumb-init

# Copy dari builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application
COPY . .

# Create non-root user untuk security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "index.js"]
