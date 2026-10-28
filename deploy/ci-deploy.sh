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
exec deploy/deploy.sh "$sha"
