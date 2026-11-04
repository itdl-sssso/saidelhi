#!/usr/bin/env bash
# run_checks.sh <base_branch> [repo_root] [--build]
# Runs the definition-of-done checks for the branch's changes and prints JSON
# ({"typecheck","lint","tests","build","repo_guard","deps_security"}: passed|failed|skipped). Logs go to stderr.
# Code changes run typecheck, lint, tests (reseeds the dev DB first, as CLAUDE.md asks); --build also
# runs `pnpm build`. Docs-only changes skip them. repo-guard and deps-security always run.
set -uo pipefail

BASE_BRANCH="${1:-main}"
REPO_ROOT="${2:-.}"
BUILD=false
[ "${3:-}" = "--build" ] && BUILD=true

cd "$REPO_ROOT" || exit 2

CHANGED=$(git diff "${BASE_BRANCH}...HEAD" --name-only 2>/dev/null || true)

has_code=false
if echo "$CHANGED" | grep -qvE '^(docs/|.*\.md$|$)'; then
  has_code=true
fi

typecheck="skipped"; lint="skipped"; tests="skipped"; build="skipped"; repo_guard="skipped"; deps_security="skipped"

run() { # run <label> <cmd...>: prints passed/failed (and returns that status); command output goes to stderr
  local label="$1"; shift
  echo "[run_checks] $label: $*" >&2
  if "$@" 1>&2; then echo passed; else echo failed; return 1; fi
}

if $has_code; then
  typecheck=$(run typecheck pnpm typecheck)
  lint=$(run lint pnpm lint)
  # DB-backed tests need a clean seed (walkthroughs and e2e mutate the shared dev DB).
  if run db pnpm db:up >/dev/null && run migrate pnpm db:migrate >/dev/null && run seed pnpm db:seed >/dev/null; then
    tests=$(run tests pnpm test)
  else
    echo "[run_checks] DB not available: start Docker, then retry" >&2
    tests="failed"
  fi
  if $BUILD; then
    build=$(run build pnpm build)
  fi
fi

if [ -x scripts/ci/repo-guard.sh ]; then
  repo_guard=$(run repo-guard scripts/ci/repo-guard.sh)
fi

if [ -x scripts/ci/deps-security.sh ]; then
  deps_security=$(run deps-security scripts/ci/deps-security.sh)
fi

cat <<EOF
{
  "typecheck": "$typecheck",
  "lint": "$lint",
  "tests": "$tests",
  "build": "$build",
  "repo_guard": "$repo_guard",
  "deps_security": "$deps_security"
}
EOF
