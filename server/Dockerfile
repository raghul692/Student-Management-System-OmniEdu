# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Security: run as non-root user
RUN addgroup -S -g 1001 omniedu && adduser -S -u 1001 -G omniedu omniedu

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production
RUN npx prisma generate

# Copy built code from builder
COPY --from=builder --chown=omniedu:omniedu /app/dist ./dist
COPY --chown=omniedu:omniedu scripts ./scripts

# Create uploads and backup directories with proper permissions
RUN mkdir -p uploads backups && chown -R omniedu:omniedu uploads backups

USER omniedu

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health/live || exit 1

CMD ["node", "dist/server.js"]
