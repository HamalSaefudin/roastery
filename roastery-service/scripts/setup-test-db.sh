#!/bin/bash
# Pastikan database roastery_test ada & schema-nya up-to-date sebelum e2e test jalan.
# Dipanggil otomatis via package.json "pretest:e2e".
set -euo pipefail

DB_NAME="roastery_test"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${DB_NAME}"

EXISTS=$(docker exec roastery-postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")
if [ "$EXISTS" != "1" ]; then
  echo "Membuat database ${DB_NAME}..."
  docker exec roastery-postgres psql -U postgres -c "CREATE DATABASE ${DB_NAME}"
fi

echo "Apply migration ke ${DB_NAME}..."
DATABASE_URL="$TEST_DATABASE_URL" pnpm exec drizzle-kit migrate

echo "Seed master wilayah ke ${DB_NAME} (idempotent, ~3 detik)..."
DATABASE_URL="$TEST_DATABASE_URL" pnpm exec tsx scripts/seed-regions.ts
