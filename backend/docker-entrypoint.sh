#!/bin/sh
# ===========================================================================
# docker-entrypoint.sh
#
# Startup sequence:
#   1. Fetch DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET from Secrets Manager
#      (before anything else — Prisma requires DATABASE_URL at migrate time)
#   2. Source the exported variables into this shell process
#   3. Run prisma migrate deploy (DATABASE_URL now available)
#   4. Optionally seed the database
#   5. exec into the Node.js application (inherits all exported env vars)
#
# Local dev (AWS_SECRETS_MANAGER_SECRET_NAME unset):
#   fetch-secrets.js writes an empty file and exits 0.
#   DATABASE_URL is expected to come from the .env file via docker-compose.
# ===========================================================================
set -e

# ---------------------------------------------------------------------------
# Step 1: Load secrets from AWS Secrets Manager
# ---------------------------------------------------------------------------
echo "=== [1/4] Loading secrets from AWS Secrets Manager ==="
node /app/scripts/fetch-secrets.js

# Source the exported variables so prisma (and all subsequent commands in
# this shell) can see DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET.
# The file is either populated by fetch-secrets.js or empty (local dev).
# shellcheck source=/dev/null
. /tmp/runtime-secrets.env

echo "=== [2/4] Running database migrations ==="
npx prisma migrate deploy

echo "=== [3/4] Running database seed ==="
npx ts-node prisma/seed.ts 2>/dev/null || echo "Seed skipped (data may already exist or ts-node unavailable)"

echo "=== [4/4] Starting application ==="
exec "$@"
