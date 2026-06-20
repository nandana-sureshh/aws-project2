# Build context: ./backend/services/user-service
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY shared/package*.json ./shared/

RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY shared/ ./shared/

RUN apk add --no-cache openssl
RUN npx --yes prisma generate --schema=./prisma/schema.prisma
RUN npm run build --prefix shared
RUN npm run build

# =====================================================
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl

COPY package*.json ./
COPY shared/package*.json ./shared/

RUN npm install --omit=dev

COPY --from=builder /app/prisma ./prisma
RUN npx --yes prisma generate --schema=./prisma/schema.prisma

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

RUN chown -R node:node /app
USER node

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3002/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
