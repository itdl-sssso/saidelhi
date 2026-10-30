#!/usr/bin/env bash
# Project rules gitleaks can't know about (the repo is public). Scans tracked files; exits 1 on any hit.
#   - no env files except the two examples
#   - no database dumps (SQL only as drizzle migrations or the legacy schema)
#   - no private keys / certificates
#   - no public IPv4 literals (server details); private, loopback and CGNAT ranges are fine
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

fail=0
report() { echo "::error::$1"; fail=1; }

while IFS= read -r f; do
  case "$f" in
    .env.example | deploy/.env.staging.example) ;;
    .env* | */.env*) report "env file tracked: $f" ;;
  esac
  case "$f" in
    drizzle/*.sql | docs/db/saidelhi-schema.sql) ;;
    *.sql | *.sql.gz | *.dump | .local-dumps/*) report "database dump tracked: $f" ;;
  esac
  case "$f" in
    *.pem | *.key | *.p12 | *id_rsa* | *id_ed25519*) report "key material tracked: $f" ;;
  esac
done < <(git ls-files)

# Dumps hide in SQL too: migrations/schema never carry row data.
if git grep -lIE '^INSERT INTO' -- '*.sql' >/dev/null; then
  report "SQL with INSERT rows (data dump?): $(git grep -lIE '^INSERT INTO' -- '*.sql' | tr '\n' ' ')"
fi

private='\b(127\.0\.0\.1|0\.0\.0\.0|10\.[0-9]+\.[0-9]+\.[0-9]+|192\.168\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+|100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]+\.[0-9]+|255\.255\.[0-9]+\.[0-9]+)\b'
ips=$(git grep -nIE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' -- ':!pnpm-lock.yaml' ':!*.svg' ':!docs/design' ':!public' | grep -vE "$private" || true)
if [ -n "$ips" ]; then
  report "public IP address in tracked files (server details must stay out of this public repo):"
  echo "$ips"
fi

[ "$fail" = 0 ] && echo "repo-guard: clean"
exit "$fail"
