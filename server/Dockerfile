FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# livekit-server-sdk is required for channel SFU endpoints; keep no-save until
# lockfile can be refreshed in a fully networked environment.
RUN npm ci --only=production \
  && npm install --omit=dev --no-save livekit-server-sdk@^2.14.0

# Copy source
COPY . .

# Expose signaling port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "index.js"]
