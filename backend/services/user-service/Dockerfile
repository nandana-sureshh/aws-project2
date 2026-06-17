# =====================================================
# user-service Dockerfile
# Build context: backend/
# Usage: docker build -f services/user-service/Dockerfile .
# =====================================================

FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json ./
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY services/user-service/package.json ./services/user-service/
COPY prisma ./prisma/

RUN npm install
RUN npx --yes prisma generate --schema=./prisma/schema.prisma
RUN npm run build --workspace=shared

COPY services/user-service/tsconfig.json ./services/user-service/
COPY services/user-service/src ./services/user-service/src
RUN npm run build --workspace=@caresync/user-service

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl

COPY package.json ./
COPY shared/package.json ./shared/
COPY services/user-service/package.json ./services/user-service/
COPY prisma ./prisma/

RUN npm install --omit=dev
RUN npx --yes prisma generate --schema=./prisma/schema.prisma

COPY --from=builder /workspace/shared/dist ./shared/dist
COPY --from=builder /workspace/services/user-service/dist ./services/user-service/dist

COPY services/user-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3002/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "services/user-service/dist/server.js"]
