# syntax=docker/dockerfile:1.7
# Staging/prod image. Built on the target host (ARM on Oracle A1), see deploy/README.md.
#   runner: Next standalone server (what runs)
#   tools:  full deps + scripts for one-off migrate / seed / legacy import

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Cache Components prerender "use cache" pages at build time, so the build reads the real DB.
# The env file comes in as a BuildKit secret (never stored in a layer); next build loads .env.production.local.
RUN --mount=type=secret,id=app_env,target=/app/.env.production.local \
    NEXT_OUTPUT=standalone pnpm build

FROM deps AS tools
COPY . .
ENV NODE_ENV=production
CMD ["pnpm", "exec", "drizzle-kit", "migrate"]

FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app \
 && mkdir -p /data/media /data/media-private /data/hf-cache && chown -R app:app /data
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]
