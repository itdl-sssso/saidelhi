#!/usr/bin/env bash
# Dependency security gate (public repo: nothing ships with a known issue, whatever the severity).
#   1. pnpm audit over all dependencies (prod + dev), every severity: any advisory fails.
#   2. Known compromised releases (scripts/ci/npm-iocs.txt `pkg`) in pnpm-lock.yaml.
#   3. Worm payloads in node_modules: payload file names, payload hashes, exfil/C2 domains.
#   4. pnpm must keep blocking dependency install scripts (no dangerouslyAllowAllBuilds).
# Exits 1 on any hit. Run by .githooks/pre-push, CI and the pr-writer skill.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

IOCS=scripts/ci/npm-iocs.txt
fail=0
report() { echo "::error::$1"; fail=1; }
entries() { grep -E "^$1 " "$IOCS" | awk '{print $2}'; }

echo "[deps-security] pnpm audit (all deps, all severities)"
if ! pnpm audit; then
  report "pnpm audit found advisories: fix them (upgrade, or override in pnpm-workspace.yaml)"
fi

echo "[deps-security] compromised releases in pnpm-lock.yaml"
while IFS= read -r spec; do
  [ -n "$spec" ] || continue
  if grep -qE "^  '?$(printf '%s' "$spec" | sed 's/[.]/\\./g')['(:]" pnpm-lock.yaml; then
    report "compromised release in lockfile: $spec"
  fi
done < <(entries pkg)

if [ -d node_modules/.pnpm ]; then
  echo "[deps-security] payload files and hashes in node_modules"
  names=$(entries file)
  hashes=$(entries sha256)
  find_args=(-name setup.mjs)
  for n in $names; do find_args+=(-o -name "$n"); done
  while IFS= read -r f; do
    base=$(basename "$f")
    if printf '%s\n' $names | grep -qxF "$base"; then
      report "worm payload file: $f"
    elif printf '%s\n' $hashes | grep -qxF "$(sha256sum "$f" | cut -d' ' -f1)"; then
      report "worm payload hash match: $f"
    fi
  done < <(find -L node_modules/.pnpm -type f \( "${find_args[@]}" \) 2>/dev/null)

  echo "[deps-security] exfil/C2 domains in installed JS"
  domains=$(entries domain)
  if [ -n "$domains" ]; then
    hits=$(grep -rlF --include='*.js' --include='*.cjs' --include='*.mjs' $(printf -- '-e %s ' $domains) node_modules/.pnpm 2>/dev/null | head -20)
    [ -z "$hits" ] || report "IOC domain found in: $(echo $hits)"
  fi
else
  echo "[deps-security] node_modules missing: run pnpm install first (payload scan skipped)" >&2
  fail=1
fi

if grep -qE '^\s*dangerouslyAllowAllBuilds:\s*true' pnpm-workspace.yaml 2>/dev/null; then
  report "pnpm-workspace.yaml allows all dependency build scripts"
fi

[ "$fail" = 0 ] && echo "[deps-security] OK"
exit "$fail"
