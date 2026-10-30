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
| `donate-page` — **/donate** (spec 51) | DONE 30 Oct 2026. Page, copy buttons, en/hi, OG, nav/footer, sitemap, routes.ts, review catalog. Footer reworded so it no longer contradicts Donate. No image (legacy image shows identifiable person). | Open: HI strings need native review. |
| `worktree-agent-a1640c5d1fadcd400` — **/gallery** (spec 52, CONTRACT v0.9.5) | DONE 28 Oct 2026, squash-merged into main 28 Oct 2026 (not pushed until user says). Public `/gallery` + `/gallery/[slug]` (lightbox), portal `/admin/gallery` (review queue, albums, album page, photo editor), WhatsApp photo intake (bot `gallery` flow, coordinators only), migration 0010 (`gallery_album`, `gallery_photo` doc tables), perms `gallery.upload`/`gallery.review`. typecheck/lint/test green; browser-checked EN+/hi 1280+375. Logs: `docs/progress/gallery*.md`. | Merged; branch kept for reference. Open: no purge of rejected/orphaned originals; editor brightness/contrast preview approximates server render; HI strings (bot + `gallery.*`, `admin.gallery.*`) need native review; touch swipe not tested on a device. |

## Review round 1 (28 Oct 2026) — merged
All 26 tickets of `docs/feedback/round-1.md` fixed in 4 tracks (logs `docs/progress/review1-{public,portal,home,features}.md`), plus admin emblem and OG link-preview fix (metadataBase = APP_URL; OG image routes skip proxy). CONTRACT v0.9.6 + v0.10. User decisions: thought of the day = official daily pull behind flag `thought_official` (off in prod until Sadhana Trust permission) + pool rotation; Join shows "Sevadal needed" badge, never counts or coordinator phones; content types admin-managed, Golden Stories feed Home stories; photos = generic form field. Open: HI strings agent-written (values, home sections, features); auditorium phone/email/hours and social URLs on Home unconfirmed; value photos ~200px (soft on mobile); uploads delete 422 text EN only; legacy `stories` type vs new `golden-stories` may be redundant.

## Next steps (in order)
1. **UI review round 1** with user via `/dev/review` (Home first — user reported design mismatches). Read `docs/feedback/round-1.md`, triage, fix in ≤2 parallel agents.
2. Gallery: review + approve merge of the gallery branch (see Open branches).
3. Client inputs pending: Bhagawan photos (7), centre photos, seva photos, WhatsApp number + Meta creds, About text, Sadhana Trust permission, DPO name, samithi local names/addresses/pins.

## Process rules (user)
- Subagents for work, caveman briefs; Opus plan/lead, Sonnet implement, Haiku small tasks.
- **Max 2 background agents at once** (machine crashes); queue the rest.
- After any crash: commit worktree WIP first (`wip: post-crash snapshot`), then resume fresh agent from its `docs/progress/*.md` log.
- Agents never commit to main; lead merges; push main to `origin` only when user asks (repo is PUBLIC — no server details, creds, personal data, discourse text). Never `pkill -f` (kills shells) — stop servers by PID from `ss -ltnp`.
- Dev login: phone 9000000003 (state admin); OTP printed in dev server log (`[whatsapp:console] … Your code is NNNNNN`).
- Never print `.env.local`, server DB creds (`../saidelhi org/saidelhiweb/settings.py`); SSH `ssh <prod-server>` needs user's password (use ControlMaster: user types once in a terminal tab).
