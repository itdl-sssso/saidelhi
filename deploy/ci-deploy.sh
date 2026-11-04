#!/usr/bin/env bash
# Forced command for the CI deploy key. Installed (copied, so a checkout can't swap it mid-run) as
# /usr/local/bin/saidelhi-ci-deploy and bound in ~ubuntu/.ssh/authorized_keys:
#   restrict,command="/usr/local/bin/saidelhi-ci-deploy" ssh-ed25519 AAAA… saidelhi-ci
# The client's command line is ignored except as the commit SHA to deploy.
set -euo pipefail
sha="${SSH_ORIGINAL_COMMAND:-}"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo "usage: ssh <host> <40-char commit sha>" >&2; exit 2; }

exec 9>/tmp/saidelhi-deploy.lock
flock -w 1800 9 || { echo "another deploy is still running" >&2; exit 75; }

cd /opt/saidelhi
git fetch --quiet origin
# Only commits on main may be deployed.
git merge-base --is-ancestor "$sha" origin/main || { echo "$sha is not on origin/main" >&2; exit 3; }
# A newer commit already landed: skip, its own run deploys it.
[[ "$(git rev-parse origin/main)" == "$sha" ]] || { echo "skip: origin/main moved past $sha"; exit 0; }
deploy/deploy.sh "$sha"

# Post-deploy operator reminders. CD has no sudo, so these only warn; they never fail the deploy.
snip=/etc/nginx/snippets/saidelhi-proxy.conf
if [[ -f "$snip" ]] && ! cmp -s "$snip" deploy/nginx/saidelhi-proxy.conf; then
  echo "WARNING: $snip differs from deploy/nginx/saidelhi-proxy.conf." >&2
  echo "WARNING: operator: sudo cp /opt/saidelhi/deploy/nginx/saidelhi-proxy.conf $snip && sudo nginx -t && sudo systemctl reload nginx" >&2
fi
if ss -ltn 2>/dev/null | awk '$4 ~ /:3000$/ && $4 !~ /^(127\.|\[::1\])/ {f=1} END {exit !f}'; then
  echo "REMINDER: :3000 listens on a non-loopback address; ensure a host firewall drops it (see deploy/README.md, Firewall)." >&2
fi
exit 0
