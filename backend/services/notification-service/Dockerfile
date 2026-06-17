# =====================================================
# notification-service Dockerfile
# Build context: backend/
# =====================================================

FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json ./
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY services/notification-service/package.json ./services/notification-service/
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build --workspace=shared

COPY services/notification-service/tsconfig.json ./services/notification-service/
COPY services/notification-service/src ./services/notification-service/src
RUN npm run build --workspace=@caresync/notification-service

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl

COPY package.json ./
COPY shared/package.json ./shared/
COPY services/notification-service/package.json ./services/notification-service/
COPY prisma ./prisma/

RUN npm install --omit=dev
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY --from=builder /workspace/shared/dist ./shared/dist
COPY --from=builder /workspace/services/notification-service/dist ./services/notification-service/dist

COPY services/notification-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3005/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "services/notification-service/dist/server.js"]
