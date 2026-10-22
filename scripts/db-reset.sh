#!/usr/bin/env bash
# Recreates the local MySQL from scratch: legacy schema → migrations → legacy content → fixtures.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose down -v
docker compose up -d --wait mysql
pnpm db:migrate
if ! pnpm db:import-legacy; then
  echo "Legacy dump not imported (see above); continuing with fixtures only." >&2
fi
pnpm db:seed
