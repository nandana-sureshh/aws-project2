#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Running database seed..."
npx ts-node prisma/seed.ts 2>/dev/null || echo "Seed skipped (data may already exist or ts-node unavailable)"

echo "Starting application..."
exec "$@"

