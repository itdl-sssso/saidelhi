#!/usr/bin/env python3
"""
scan_diff.py — scan the branch diff for concerns specific to the saidelhi repo (public repo).

Usage:
    python3 scan_diff.py <base_branch> [repo_root]

Prints JSON:
  secrets_found            env files or key-like strings in added lines
  server_details_found     public IPv4 addresses or ssh user@host in added lines
  personal_data_found      real-looking Indian mobile numbers or emails in added lines (dev seeds use +91 90000 0000x)
  new_migrations           drizzle/*.sql files added
  legacy_table_touched     a migration ALTERs/DROPs a legacy Django table (they must never be altered)
  contract_without_doc     src/contract changed but docs/CONTRACT.md did not
  messages_unpaired        messages/en.json and messages/hi.json don't have the same keys
  areas                    touched areas (backend, frontend, migrations, contract, messages, infra, docs)
  concerns                 human-readable list
"""

import json
import re
import subprocess
import sys
from pathlib import Path

BASE = sys.argv[1] if len(sys.argv) > 1 else "main"
ROOT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(".")


def git(*args: str) -> str:
    try:
        return subprocess.check_output(["git", *args], cwd=ROOT, text=True, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        return ""


changed = git("diff", f"{BASE}...HEAD", "--name-only").splitlines()
added_files = git("diff", f"{BASE}...HEAD", "--name-only", "--diff-filter=A").splitlines()
# Added lines only, per file, skipping lockfiles, design exports (third-party noise) and this scanner (its own patterns).
diff = git(
    "diff", f"{BASE}...HEAD", "--unified=0", "--", ".",
    ":!pnpm-lock.yaml", ":!docs/design", ":!public", ":!.claude/skills/pr-writer",
)

added: list[tuple[str, str]] = []
current = ""
for line in diff.splitlines():
    if line.startswith("+++ b/"):
        current = line[6:]
    elif line.startswith("+") and not line.startswith("+++"):
        added.append((current, line[1:]))

concerns: list[str] = []
result = {
    "secrets_found": False,
    "server_details_found": False,
    "personal_data_found": False,
    "new_migrations": False,
    "legacy_table_touched": False,
    "contract_without_doc": False,
    "messages_unpaired": False,
    "areas": [],
    "concerns": concerns,
}

# ── Areas (mirrors the backend/frontend track split in CLAUDE.md) ─────────────
AREAS = {
    "backend": r"^(src/server|src/app/api|scripts)/",
    "frontend": r"^(src/app/\[locale\]|src/ui|src/features|public)/",
    "contract": r"^src/contract/",
    "migrations": r"^drizzle/",
    "messages": r"^messages/",
    "infra": r"^(\.github/|deploy/|Dockerfile|docker-compose|compose\.ya?ml|next\.config|package\.json)",
    "tests": r"^tests/",
    "docs": r"^docs/|\.md$",
}
result["areas"] = [a for a, rx in AREAS.items() if any(re.search(rx, f) for f in changed)]

# ── Secrets ───────────────────────────────────────────────────────────────────
env_files = [f for f in changed if re.search(r"(^|/)\.env", f) and not f.endswith((".example",))]
if env_files:
    result["secrets_found"] = True
    concerns.append(f"Env file(s) in diff: {', '.join(env_files)}")
SECRET_RX = [
    (r"-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY", "private key"),
    (r"\b(sk|pk|rk)-[A-Za-z0-9_-]{20,}", "API key (sk-/pk-)"),
    (r"\bEAA[A-Za-z0-9]{40,}", "Meta/WhatsApp access token"),
    (r"\bAKIA[0-9A-Z]{16}\b", "AWS access key"),
    (r"\bgh[pousr]_[A-Za-z0-9]{30,}", "GitHub token"),
    # Token-like value: 24+ chars of [A-Za-z0-9+_-] with at least one digit (paths and words don't match).
    (r"\b[A-Z][A-Z0-9_]{5,}\s*=\s*['\"]?(?=[A-Za-z_+-]*\d)[A-Za-z0-9+_-]{24,}['\"]?\s*;?$", "token-like value assigned to an UPPER_CASE key"),
    (r"mysql://[^:\s]+:[^@\s]{4,}@(?!127\.0\.0\.1|localhost|mysql)", "DB URL with password"),
]
for f, line in added:
    for rx, label in SECRET_RX:
        if re.search(rx, line) and "example" not in f:
            result["secrets_found"] = True
            concerns.append(f"{f}: possible {label}")
            break

# ── Server details (repo is public) ───────────────────────────────────────────
PRIVATE_IP = re.compile(
    r"^(127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|255\.255\.)"
)
for f, line in added:
    for ip in re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", line):
        if not PRIVATE_IP.match(ip) and all(int(p) <= 255 for p in ip.split(".")):
            result["server_details_found"] = True
            concerns.append(f"{f}: public IP {ip}")
    if re.search(r"\bssh\s+(-\S+\s+)*[\w.-]+@(?!<)[\w.-]+", line) and "<prod-server>" not in line:
        result["server_details_found"] = True
        concerns.append(f"{f}: ssh user@host — use a placeholder like <prod-server>")

# ── Personal data ─────────────────────────────────────────────────────────────
for f, line in added:
    if f.startswith(("tests/", "scripts/seed")):
        continue
    for m in re.findall(r"(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b", line):
        digits = re.sub(r"\D", "", m)[-10:]
        if not digits.startswith("90000") and not digits.startswith("98765"):  # dev seed / placeholder
            result["personal_data_found"] = True
            concerns.append(f"{f}: phone number {m} — real person's number?")
    for email in re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", line):
        if not re.search(r"@(example\.|anthropic\.com|users\.noreply\.github\.com)", email):
            result["personal_data_found"] = True
            concerns.append(f"{f}: email {email} — personal or public org address?")

# ── Migrations ────────────────────────────────────────────────────────────────
new_migs = [f for f in added_files if re.match(r"^drizzle/\d+_.*\.sql$", f)]
if new_migs:
    result["new_migrations"] = True
    concerns.append(f"New migration(s): {', '.join(new_migs)}. Run `pnpm db:migrate` on a fresh `pnpm db:reset` DB.")
schema = ROOT / "docs/db/saidelhi-schema.sql"
legacy = set(re.findall(r"CREATE TABLE `?(\w+)`?", schema.read_text())) if schema.exists() else set()
for f in [c for c in changed if c.startswith("drizzle/") and c.endswith(".sql")]:
    path = ROOT / f
    if not path.exists():
        continue
    sql = path.read_text()
    for t in legacy:
        if re.search(rf"(ALTER|DROP|RENAME)\s+TABLE\s+`?{t}`?\b", sql, re.I):
            result["legacy_table_touched"] = True
            concerns.append(f"{f}: alters legacy table `{t}` — legacy tables must stay untouched (use a side table)")

# ── Contract ──────────────────────────────────────────────────────────────────
if any(f.startswith("src/contract/") for f in changed) and "docs/CONTRACT.md" not in changed:
    result["contract_without_doc"] = True
    concerns.append("src/contract changed without a docs/CONTRACT.md §10 amendment")

# ── Messages EN/HI parity (every key in one file must exist in the other) ─────
def flat_keys(d: dict, prefix: str = "") -> set[str]:
    out: set[str] = set()
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        out |= flat_keys(v, key) if isinstance(v, dict) else {key}
    return out

if any(f.startswith("messages/") for f in changed):
    try:
        en = flat_keys(json.loads((ROOT / "messages/en.json").read_text()))
        hi = flat_keys(json.loads((ROOT / "messages/hi.json").read_text()))
    except (OSError, json.JSONDecodeError) as e:
        en = hi = set()
        result["messages_unpaired"] = True
        concerns.append(f"messages JSON unreadable: {e}")
    if en - hi:
        result["messages_unpaired"] = True
        concerns.append(f"Keys in en.json missing from hi.json: {', '.join(sorted(en - hi)[:15])}")
    if hi - en:
        result["messages_unpaired"] = True
        concerns.append(f"Keys in hi.json missing from en.json: {', '.join(sorted(hi - en)[:15])}")

concerns[:] = list(dict.fromkeys(concerns))  # same finding on several lines → once
print(json.dumps(result, indent=2, ensure_ascii=False))
