# Handoff — 25 Oct 2026 (session ended by power loss; user switching account)

Main HEAD at handoff: see `git log -1` (after commit "docs: handoff"). All milestones M0–M7 done + post-M7 work below. Pushed to github.com/itdl-sssso/saidelhi (public) on 25 Oct 2026 after history redaction (server SSH details replaced with placeholders; pre-redact history kept locally as tag `pre-redact-main` + bundle in `~/Claude/backups/` — never push those).

## Done since M7 (all merged on main)
| Item | Notes |
|---|---|
| Discourse audio/video (M7.1) | `discourse_media` (mig 0009); 7 official Radio Sai audio + 55 high-confidence YouTube auto-live; 48 medium hidden. User decision: no manual review queue — user flags bad ones during review. |
| Real districts | 10 districts / 56 samithis from ssssoindia.org (`docs/data/sssso-delhi-ncr-units.*`, `src/server/data/sssso-units.json`). Samithi local names unknown (client sheet). |
| Volunteer → **Sevadal** | All UI copy; `/admin/volunteers` 301 → `/admin/sevadal`; internal identifiers stay `volunteer` (CONTRACT v0.9.1). |
| Own brand assets | OG images per route EN/HI, icons, manifest, transparent emblem, PDF/QR letterhead, WhatsApp images (`scripts/gen-brand-assets.ts`). |
| Prod 404 fix | proxy `notFoundResponse()` self-fetch (needs `PORT` = Next listen port in deploy). |
| Prefetch hang fix | portal LanguageSwitch `prefetch={false}`; regression `tests/e2e/journeys/prefetch.spec.ts`. |
| Redirect journey 32s → 2.8s | waterfall `docs/progress/M7-redirect-waterfall.html` (cause: networkidle + hung prefetch). |
| `/dev/review` tracker | dev-only; feedback → `docs/feedback/<round>.{json,md}` + `shots/`. Round 1 NOT started/filled yet. |
| Discourse revert | per-paragraph Restore (published / AI draft) + "Discard changes since publish" (`POST /admin/discourses/:id/revert`, CONTRACT v0.9.2). "To the Students" s1 was manually restored from snapshot (user's accidental edit backed up in old session scratchpad, not needed). |
| LAN dev | `DEV_ORIGINS=<ip,ip> DEV_INSECURE_COOKIES=1 pnpm dev --port 4100 -H 0.0.0.0` (dev only; Secure cookie dropped only with flag). Last LAN IPs: 172.20.10.9 (hotspot), 100.112.7.76 (Tailscale). Firewall: `sudo ufw allow 4100/tcp` if blocked. |
| Client asks | `docs/data/media-and-content-needs.xlsx` (slim: What we need 6 rows + Samithi details 56) + WhatsApp message (in chat history; regenerate from sheet). |
| Legacy media | Server media root `<legacy-app-dir>/media` (592 files, 212M) == local `MEDIA_ROOT` exactly (rsync dry-run: 0 diffs). Nothing to pull. |

## Open branches (NOT merged)
| Branch / worktree | State | Next |
|---|---|---|
| `worktree-agent-ae67270dd13934ac1` (`.claude/worktrees/agent-ae67270dd13934ac1`) — **/donate** | WIP `c9feaa2`: page, copy buttons, en/hi, OG, nav/footer, sitemap, routes.ts, review catalog, spec 51. **DoD not run.** No image (legacy image shows identifiable person). | Merge main, run `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, screenshot 1280/375/hi, merge. ⚠ Footer says "Nothing is ever collected from the public" — contradicts Donate page; reword (e.g. "No fees for any programme"). |
| `worktree-agent-a1640c5d1fadcd400` — **/gallery** (PARKED by user) | WIP `39681d4`: backend only (contract, service, repo, API). See `docs/progress/gallery.md` in that worktree for scope. | Resume later on user request. |

## Next steps (in order)
1. Finish + merge /donate (above).
2. **UI review round 1** with user via `/dev/review` (Home first — user reported design mismatches). Read `docs/feedback/round-1.md`, triage, fix in ≤2 parallel agents.
3. Gallery when user un-parks.
4. Client inputs pending: Bhagawan photos (7), centre photos, seva photos, WhatsApp number + Meta creds, About text, Sadhana Trust permission, DPO name, samithi local names/addresses/pins.

## Process rules (user)
- Subagents for work, caveman briefs; Opus plan/lead, Sonnet implement, Haiku small tasks.
- **Max 2 background agents at once** (machine crashes); queue the rest.
- After any crash: commit worktree WIP first (`wip: post-crash snapshot`), then resume fresh agent from its `docs/progress/*.md` log.
- Agents never commit to main; lead merges; push main to `origin` only when user asks (repo is PUBLIC — no server details, creds, personal data, discourse text). Never `pkill -f` (kills shells) — stop servers by PID from `ss -ltnp`.
- Dev login: phone 9000000003 (state admin); OTP printed in dev server log (`[whatsapp:console] … Your code is NNNNNN`).
- Never print `.env.local`, server DB creds (`../saidelhi org/saidelhiweb/settings.py`); SSH `ssh <prod-server>` needs user's password (use ControlMaster: user types once in a terminal tab).
