#!/usr/bin/env bash
# Pull, build on this host, migrate, restart. Run from the checkout (e.g. /opt/saidelhi):
#   deploy/deploy.sh            # deploy origin/main
#   deploy/deploy.sh <git-ref>  # deploy a branch/tag/sha
# Rollback: APP_TAG=<previous sha> docker compose -f deploy/compose.yml up -d app
set -euo pipefail
cd "$(dirname "$0")/.."

ref="${1:-origin/main}"
data="${SAIDELHI_DATA:-/srv/saidelhi}"
compose=(docker compose -f deploy/compose.yml)

[[ -f deploy/.env.staging ]] || { echo "missing deploy/.env.staging (copy deploy/.env.staging.example)"; exit 1; }

git fetch --quiet origin
git checkout --quiet --detach "$ref"
export APP_TAG="$(git rev-parse --short HEAD)"
echo "==> deploying $ref ($APP_TAG)"

mkdir -p "$data"/{media,media-private,hf-cache,imports}
# App runs as uid 1001 and writes uploads + model cache.
chown -R 1001:1001 "$data"/{media,media-private,hf-cache} 2>/dev/null || sudo chown -R 1001:1001 "$data"/{media,media-private,hf-cache}

"${compose[@]}" up -d --wait mysql
docker buildx build --target tools --tag "saidelhi-tools:$APP_TAG" --tag saidelhi-tools:latest --load .
"${compose[@]}" --profile tools run --rm tools pnpm exec drizzle-kit migrate
# Build after migrating: the build prerenders cached pages from the live DB.
docker buildx build --network host --secret id=app_env,src=deploy/.env.staging \
  --target runner --tag "saidelhi-app:$APP_TAG" --tag saidelhi-app:latest --load .
"${compose[@]}" up -d --wait app

# Keep the last 5 app images for rollback.
docker images saidelhi-app --format '{{.CreatedAt}}\t{{.Tag}}' | sort -r | cut -f2 \
  | grep -vx latest | tail -n +6 | xargs -r -I{} docker rmi "saidelhi-app:{}" >/dev/null || true
docker image prune -f >/dev/null
echo "==> live: $APP_TAG"
