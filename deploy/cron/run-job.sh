#!/usr/bin/env bash
# Trigger one app job over loopback: deploy/cron/run-job.sh <job>
# CRON_SECRET is read from the env file so it never sits in a crontab.
set -euo pipefail
env_file="$(dirname "$0")/../.env.staging"
secret="$(grep -E '^CRON_SECRET=' "$env_file" | cut -d= -f2-)"
curl -fsS -m 120 -X POST -H "Authorization: Bearer $secret" "http://127.0.0.1:3000/api/v1/cron/$1"
echo
