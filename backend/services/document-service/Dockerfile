# =====================================================
# document-service Dockerfile
# Build context: backend/
# =====================================================

FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json ./
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY services/document-service/package.json ./services/document-service/
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build --workspace=shared

COPY services/document-service/tsconfig.json ./services/document-service/
COPY services/document-service/src ./services/document-service/src
RUN npm run build --workspace=@caresync/document-service

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl

COPY package.json ./
COPY shared/package.json ./shared/
COPY services/document-service/package.json ./services/document-service/
COPY prisma ./prisma/

RUN npm install --omit=dev
RUN npx prisma generate --schema=./prisma/schema.prisma

COPY --from=builder /workspace/shared/dist ./shared/dist
COPY --from=builder /workspace/services/document-service/dist ./services/document-service/dist

COPY services/document-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3004/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "services/document-service/dist/server.js"]
