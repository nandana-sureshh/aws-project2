# =====================================================
# ai-service Dockerfile
# Build context: backend/
# =====================================================

FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json ./
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY services/ai-service/package.json ./services/ai-service/
COPY prisma ./prisma/

RUN npm install
RUN npx --yes prisma generate --schema=./prisma/schema.prisma
RUN npm run build --workspace=shared

COPY services/ai-service/tsconfig.json ./services/ai-service/
COPY services/ai-service/src ./services/ai-service/src
RUN npm run build --workspace=@caresync/ai-service

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl

COPY package.json ./
COPY shared/package.json ./shared/
COPY services/ai-service/package.json ./services/ai-service/
COPY prisma ./prisma/

RUN npm install --omit=dev
RUN npx --yes prisma generate --schema=./prisma/schema.prisma

COPY --from=builder /workspace/shared/dist ./shared/dist
COPY --from=builder /workspace/services/ai-service/dist ./services/ai-service/dist

COPY services/ai-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3006/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "services/ai-service/dist/server.js"]
