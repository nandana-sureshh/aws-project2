# =====================================================
# appointment-service Dockerfile
# Build context: backend/
# =====================================================

FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json ./
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
COPY services/appointment-service/package.json ./services/appointment-service/
COPY prisma ./prisma/

RUN npm install
RUN npx --yes prisma generate --schema=./prisma/schema.prisma
RUN npm run build --workspace=shared

COPY services/appointment-service/tsconfig.json ./services/appointment-service/
COPY services/appointment-service/src ./services/appointment-service/src
RUN npm run build --workspace=@caresync/appointment-service

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl

COPY package.json ./
COPY shared/package.json ./shared/
COPY services/appointment-service/package.json ./services/appointment-service/
COPY prisma ./prisma/

RUN npm install --omit=dev
RUN npx --yes prisma generate --schema=./prisma/schema.prisma

COPY --from=builder /workspace/shared/dist ./shared/dist
COPY --from=builder /workspace/services/appointment-service/dist ./services/appointment-service/dist

COPY services/appointment-service/docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3003/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "services/appointment-service/dist/server.js"]
