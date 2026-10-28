---
name: pr-writer
description: >
  Writes and opens a pull request for the current branch of the saidelhi repo (Next.js + MySQL, public GitHub repo).
  Use whenever the user asks to "write a PR", "open a PR", "create a pull request", "draft a PR description",
  "prepare a PR", "let's PR this", "write up the PR", "summarize changes for a PR" or "are we ready to PR".
  Accepts an optional base branch (default: main). Runs the definition-of-done checks (typecheck, lint, tests,
  optional build, repo-guard) and a diff scan for secrets, server details, personal data, migrations touching
  legacy tables, contract drift and EN/HI message parity, then fills the checklist from the results.
---

## What this skill does

1. Works out what the branch changes and which areas it touches.
2. Runs the checks (`scripts/run_checks.sh`). **Hard gate: no PR while any check fails.**
3. Scans the diff (`scripts/scan_diff.py`). This repo is **public**: secrets, server details and personal data are blockers.
4. Writes the title + description, pushes the branch, opens the PR, binds it to the session.

| Script | Purpose |
|---|---|
| `scripts/run_checks.sh <base> <repo_root> [--build]` | `pnpm typecheck`, `pnpm lint`, `pnpm db:seed` + `pnpm test`, optional `pnpm build`, `scripts/ci/repo-guard.sh`. JSON: `typecheck`, `lint`, `tests`, `build`, `repo_guard` = `passed`/`failed`/`skipped`. Code checks are skipped for docs-only diffs. |
| `scripts/scan_diff.py <base> [repo_root]` | JSON flags `secrets_found`, `server_details_found`, `personal_data_found`, `new_migrations`, `legacy_table_touched`, `contract_without_doc`, `messages_unpaired`, plus `areas` and `concerns`. |

Paths below are relative to the repo root: `.claude/skills/pr-writer/scripts/…`.

---

## Step 1 — Establish the diff

Base branch from the user's message, else `main`. Fetch first so the base is current:

```bash
git fetch -q origin
git log origin/<base>..HEAD --oneline
git diff origin/<base>...HEAD --stat
```

- No commits ahead → say "No commits ahead of `<base>` — nothing to PR yet." and stop.
- On `main` itself with local commits → create a branch first (`git switch -c <short-topic>`); never push to `main`.
- Uncommitted changes → ask whether they belong in this PR before going on.

Areas come from `scan_diff.py` (`areas`): **backend** (`src/server`, `src/app/api`, `scripts`), **frontend**
(`src/app/[locale]`, `src/ui`, `src/features`, `public`), **contract** (`src/contract`), **migrations** (`drizzle/`),
**messages** (`messages/`), **infra** (`.github`, `deploy`, Docker, `next.config`, `package.json`), **tests**, **docs**.

---

## Step 2 — Run checks (MUST PASS BEFORE PR)

```bash
bash .claude/skills/pr-writer/scripts/run_checks.sh origin/<base> . [--build]
```

Pass `--build` when infra, `next.config`, routes/layouts, proxy or caching changed (CI runs the build anyway; catching it
locally is cheaper). Tests reseed the dev DB (needs Docker; `pnpm db:up`), which wipes dev sessions — say so if the user's
dev server is running.

**HARD GATE — do not open the PR while any value is `"failed"`.**
1. Show the failing output.
2. Fix the root cause (`pnpm lint --fix` for autofixable lint; real fixes for types/tests; never `@ts-ignore` or skip a test to go green).
3. Re-run until everything is `"passed"` or `"skipped"`.

Applies even if the failure already exists on `main`: CI blocks merge, so fix it here or in a separate PR first.
Never tick a box the script did not confirm.

---

## Step 3 — Scan the diff

```bash
python3 .claude/skills/pr-writer/scripts/scan_diff.py origin/<base> .
```

Blocking (fix before the PR, or get the user's explicit OK for each item):
- `secrets_found` — env file or key/token in added lines. Remove it, and tell the user to **rotate** it: pushed means leaked.
- `server_details_found` — public IP or `ssh user@host`. Use placeholders (`<prod-server>`, `<legacy-user>`).
- `personal_data_found` — a phone number or email that isn't a dev seed (`+91 90000 0000x`) or placeholder. Public org
  addresses (e.g. a bookings inbox) are fine once the user confirms.
- `legacy_table_touched` — a migration alters a legacy Django table. Never allowed: use a side table.

Non-blocking, but must be resolved in the PR:
- `contract_without_doc` — add the `docs/CONTRACT.md` §10 amendment in this PR (CLAUDE.md rule).
- `messages_unpaired` — add the missing EN/HI keys.
- `new_migrations` — note it in the description; tick "applies on a fresh DB" only after `pnpm db:reset` worked.

---

## Step 4 — Type of change

One or more of: Bug fix / New feature / Refactor / Config & infra / Docs.

---

## Step 5 — Write the PR

**Title**: imperative, present tense, under 70 characters, names the area ("Add photos field to form links",
"Fix portal 404 for out-of-scope events"). No ticket dumps.

**Description** — fill only what's true; include conditional sections only when that area changed:

```
## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Config / infra
- [ ] Docs

## Summary
<!-- What and why, in a few bullets a reviewer can check. Group by area (Public / Portal / Bot / Infra). -->

## Checks
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (fresh seed)
- [ ] `pnpm build` passes
- [ ] Checked in the browser (1280 / 375 / `/hi`)

## Security (public repo)
- [ ] No secrets, env files or keys in the diff
- [ ] No server details (IPs, hostnames, ssh users)
- [ ] No personal data (phones, emails, legacy dump rows)
- [ ] New/changed endpoints check RBAC scope and CSRF

## Contract *(if src/contract changed)*
- [ ] `docs/CONTRACT.md` §10 amendment added

## Migrations *(if drizzle/ changed)*
- [ ] New migration under `drizzle/`, legacy tables untouched
- [ ] Applies on a fresh DB (`pnpm db:reset`)

## i18n *(if messages/ changed)*
- [ ] EN and HI keys match
- [ ] New Hindi copy flagged for native review

## Infra *(if .github/, deploy/ or Docker changed)*
- [ ] Workflow / deploy change explained (what runs when)
- [ ] Staging smoke-tested after deploy

## Not done / follow-ups
<!-- Anything left open; omit the section if nothing. -->

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Filling rules:
- `typecheck` / `lint` / `tests` / `build` boxes → `[x]` only when `run_checks.sh` said `"passed"`. `"skipped"` → leave `[ ]` and add "(skipped: docs only)" or "(not run)".
- Security boxes → `[x]` when the matching `scan_diff.py` flag is `false` (or each hit was confirmed safe by the user — say so).
- `CONTRACT.md` box → `[x]` when `contract_without_doc == false`. EN/HI box → `[x]` when `messages_unpaired == false`.
- `legacy tables untouched` → `[x]` when `legacy_table_touched == false`.
- **Always leave for the human** (unless you actually did it this session and saw it work): browser check, RBAC/CSRF review,
  fresh-DB migration, staging smoke test, native Hindi review.

---

## Step 6 — Open the PR

```bash
git push -u origin HEAD
gh pr create --base <base> --title "<title>" --body "$(cat <<'EOF'
<description>
EOF
)"
```

Then bind it to the session (`mcp__ccd_pr__get_status`, `bind_pr` if not shown) and read CI from there; don't poll
`gh pr checks`. CI (`.github/workflows/ci.yml`) runs typecheck/lint/test/build, secrets + repo-guard, dependency audit
and CodeQL; merging to `main` triggers CD (`cd.yml`) to staging. **Do not merge** — stop after creating.

Finish with the PR URL and a **Concerns** line: each `scan_diff.py` concern on its own line, or `No concerns found.`
