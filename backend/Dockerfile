FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src ./src/
COPY scripts ./scripts/

RUN npm run db:generate
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache curl openssl

COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./

RUN npm ci

RUN npm run db:generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts/

RUN mkdir -p ./uploads/documents ./uploads/prescriptions

COPY docker-entrypoint.sh ./
# Normalise line endings to LF — prevents "not found" errors on Alpine when
# the file was committed on Windows with CRLF endings.
RUN sed -i 's/\r//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
