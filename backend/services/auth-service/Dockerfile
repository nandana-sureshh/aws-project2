# =====================================================
# auth-service Dockerfile
# Build context: backend/  (REQUIRED)
# Usage: docker build -f services/auth-service/Dockerfile .
# =====================================================

FROM node:20-alpine AS builder

WORKDIR /workspace

# Copy workspace manifest
COPY package.json ./

# Copy shared package
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src

# Copy service package
COPY services/auth-service/package.json ./services/auth-service/

# Copy prisma schema
COPY prisma ./prisma/

# Install all workspace dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build shared package
RUN npm run build --workspace=shared

# Copy and build auth-service
COPY services/auth-service/tsconfig.json ./services/auth-service/
COPY services/auth-service/src ./services/auth-service/src
RUN npm run build --workspace=@caresync/auth-service

# =====================================================
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl

# Copy workspace manifest and package files for prod install
COPY package.json ./
COPY shared/package.json ./shared/
COPY services/auth-service/package.json ./services/auth-service/
COPY prisma ./prisma/

RUN npm install --omit=dev

# Generate Prisma client in production image
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy compiled output
COPY --from=builder /workspace/shared/dist ./shared/dist
COPY --from=builder /workspace/services/auth-service/dist ./services/auth-service/dist

# Copy entrypoint
COPY services/auth-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "services/auth-service/dist/server.js"]
