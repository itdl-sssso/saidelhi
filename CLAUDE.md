@AGENTS.md

# SSSSO Delhi NCR platform — project state & handoff

Rebuild of saidelhi.org (Sri Sathya Sai Seva Organisation, Delhi NCR): bilingual public site + coordinator portal (`/admin`) + event form links (`/f/<token>`) + WhatsApp bot. Last updated **24 Oct 2026** (M7 done).

## Read these first
| File | What |
|---|---|
| `docs/CONTRACT.md` | **The dev contract** between backend & frontend tracks (architecture, API envelope, error codes, DTOs, endpoint catalogue, frontend reactions, data model, milestones, amendments log §10 + backlogs). Any shape change → update it in the same commit. |
| `docs/specs/README.md` + `docs/specs/NN-*.md` | 50 page specs (source of truth for scope, copy rules, states, acceptance). |
| `docs/design/` | Claude Design export: `public/`, `portal/` (batch HTML + JSX prototypes), `wireframes/` (Home 3D lotus, Values, Calendar, Map), `ds-additions/`, `assets/` (real Sarva Dharma emblem, lotus.glb). Recreate faithfully; prototypes are reference, not code to copy. |
| `design-system/tokens/*.css` | Design tokens (SSSSO Delhi NCR design system, claude.ai/design project `9ec6b9ec-3169-4084-8acf-09aeff92e3a6`). |
| `docs/db/saidelhi-schema.sql` | Live legacy Django MySQL schema (14 tables) from server. |
| `docs/whatsapp-setup.md` | Meta WhatsApp Cloud API setup guide (creds pending from user). |

## Stack & decisions (agreed with user)
- One Next.js 16 app (App Router, TS strict, `src/`, Cache Components on). Next 16 differs from training data: read `node_modules/next/dist/docs/` before using an API.
- REST `/api/v1/*` route handlers; RSC call services directly (`services()` from `@/server/services`) with the same contract DTOs (`src/contract`, zod).
- MySQL 8, **reuse existing Django schema** (`saidelhi` DB) + Drizzle migrations on top; legacy tables never altered (side tables like `article_i18n`). Local: `docker compose` → container `saidelhi-mysql` on **:3307**. `DATA_SOURCE=mock|db`.
- Auth: WhatsApp OTP (console provider in dev prints codes to server log), DB sessions, `sid` + `csrf` cookies, header `x-csrf`. RBAC role + org scope (state → district → samithi).
- i18n: next-intl, EN unprefixed, HI under `/hi`. Strings in `messages/{en,hi}.json` (portal strings under top-level `admin` key).
- Styling: tokens + Tailwind v4 `@theme` for layout, CSS Modules for components (`src/ui`, kitchen sink at `/dev/ui`, dev only).
- WhatsApp: real Cloud API adapter written; switch `WHATSAPP_PROVIDER=cloud` when user supplies creds. AI extraction: rules-first + SmolLM2 (`smollm2:1.7b`, 360m on weak server) via Ollama, `EXTRACTOR_PROVIDER=rules|ollama`; prod server cannot run big LLMs. Discourses: 87 already translated at `~/Claude/sssso-platform/discourses/translations/*.hi.json` (import in M7, behind `discourses` flag).
- Legacy content: dump at `.local-dumps/saidelhi-content.sql` (gitignored, contains personal data; `pnpm db:import-legacy`). Legacy media served from `MEDIA_ROOT` (dev: `/home/sam/Claude/saidelhi org/media`) at `/media/*`.
- Real districts (24 Oct 2026, from `docs/data/sssso-delhi-ncr-units.json`, normalised in `src/server/data/sssso-units.json`): Central, East, North, South East, South West, West, Faridabad, Gurugram, Gautam Buddh Nagar, Ghaziabad. 56 samithis/units ("East 2", "Gautam Buddh Nagar 3", "Greater Noida West" bhajan mandali stored as samithi); 19 have address+coords and get a centre. Dev fictional centres hang off coord-less samithis.
- Server: `ssh <prod-server>` (user types password). Legacy Django app runs as user `<legacy-user>`; DB creds are in `../saidelhi org/saidelhiweb/settings.py` (plaintext — never echo; user advised to rotate).

## Commands
```bash
pnpm db:up && pnpm db:migrate && pnpm db:import-legacy && pnpm db:seed   # or pnpm db:reset
pnpm dev --port 4100          # review server used by the user
pnpm typecheck && pnpm lint && pnpm test && pnpm build   # definition of done
```
Run `pnpm db:seed` before `pnpm test` if the DB was mutated by a walkthrough (links integration test needs clean seed). Seed prints dev login phones (+91 90000 00001…09, one per role) and dev form-link tokens (e.g. eye report `/f/nmopMGuEp-SJ1ZDJLZFslA`, phone 9000000001).

## Milestone status
| # | Milestone | Backend | Frontend | Commit |
|---|---|---|---|---|
| M0 | Foundation | ✅ | ✅ | `001670d` |
| M1 | Public core: Home (3D lotus), Calendar, Event, Centre, Impact, Privacy | ✅ (in M0) | ✅ | `a221548` |
| M2 | Form links `/f/[token]` (OTP verify, generic form renderer, offline drafts/queue, done/gone) | ✅ | ✅ | `fa41031` |
| M3 | Portal core: login, shell, Overview, Events, Event detail, Plan event, Approvals, Links, Org, People, Audit | ✅ `a19a373` | ✅ walkthrough done 23 Oct (fixes: table sr-only overflow, 375px top bar, hi plurals, overdue seed links) | see git log |
| M4 | WhatsApp bot flows + webhook + reminders, extractor (rules + SmolLM via Ollama), Review inbox, WhatsApp admin, opt-in endpoint, dev simulator `/dev/whatsapp`, proxy 404s | ✅ | ✅ walkthrough done | see git log (merges `30e2bf2`…) |
| M5 | Public P1: Values ×5, About, Programs, Program, News/Article, Join (number+QR+opt-in form), Map (Leaflet+OSM), District, legacy 301 redirects (`redirect` table, migration 0005), sitemap/robots, legacy polish | ✅ | ✅ | merges `08e80b2`…`4127b36` + integration |
| M6 | Portal P1: form templates/builder, uploads (xlsx), centres, partners, content (native `article`, tiptap), impact controls, migration, volunteers, reports/exports, health, follow-up, privacy, settings; crons publish-scheduled/monthly-report/retention | ✅ | ✅ | merges `556cd5e` + integration |
| M7 | Discourses (flag) import + pages + workspace; a11y/perf pass; Playwright e2e (`pnpm e2e:journeys`, `e2e:a11y`, `e2e:perf`) | ✅ | ✅ | merges `df5cb12`…`c0825d8` + fixes |

### Immediate next steps (in order)
1. **UI feedback session with user** (user 23 Oct: UI mismatches vs design, at least Home page first).
2. Then TODO(user) items below (real districts/coords, WhatsApp creds + public number, About text, Sadhana Trust permission for discourses).

### Known open issues
- In-process rate limits and bot-challenge reuse (single node only).
- Personal answers not field-encrypted; private attachment retention purge job not written.
- M4 leftovers: chat register photos only acknowledged (bytes stored via inbox ingest only); no retention purge for `whatsapp_message`/inbox media; no per-number inbound rate limit; webhook runs in `after()` without queue (broadcasts sequential, cap 1000); seeded Meta template statuses fictional; reminder rules global.
- Public 404s for unknown event/centre handled by existence probe in `src/proxy.ts` (60s cache) because Cache Components + Suspense layout fix status at 200.
- Hindi hero/value copy + all M5 HI strings written by an agent — needs native review (value prose shows EN with notice until `HI_PROSE_READY`).
- Real SSSSO districts/samithis researched (24 Oct): `docs/data/sssso-delhi-ncr-units.{md,json}` (10 districts, 56 units) — not yet applied, awaiting user OK. Image asset needs: `docs/data/image-needs.md`.
- M5 TODO(user): `WHATSAPP_PUBLIC_NUMBER`, real districts + centre coords, NCR pincode table (approx, `src/server/data/ncr-pincodes.json`), About contact/auditorium/founder text+photo, llms.txt.
- M6 leftovers: new entities stored as JSON doc tables (`repo.m6`, migrations 0006/0007); monthly PDF ASCII-only (Hindi → `?`, needs Devanagari font); centre photo EXIF not stripped; privacy `PR-nnnn` ref derived by order (unstable if deleted); redirects cache 5 min; retention purge only tested on mock repo; 375px/`/hi` not fully browser-checked on all M6 pages (cover in M7 a11y pass).
- M7 leftovers: `discourses` flag defaults ON only in development (prod stays off until Sadhana Trust written permission); e2e global-setup turns it on via settings API. Discourse audio/video (M7.1): `discourse_media` (migration 0009) imported from `$DISCOURSES_DIR/media/index.json` (7 official Radio Sai audio + 103 YouTube candidates; official audio + high-confidence video auto-approved, rest approved in workspace side panel); YouTube click-to-load nocookie facade; no reorder UI. Portal URLs with a query string: sidebar same-path RSC prefetch body never completes (browser aborts ~30s) — e2e must not use `networkidle` there; app-side cause uninvestigated. Proxy probe treats DB errors as "exists" → rare 200 on first cold hit. `tests/e2e/known.ts` empty (a11y 230/230, perf 20/20 budgets). Home CLS 0.074 (<0.1). M6 portal pages got automated 375px overflow check only, no manual /hi pass. Redirect journey slow (~31s, uninvestigated). e2e global-setup reseeds shared DB (wipes sessions) — run `pnpm db:seed` before `pnpm test` after e2e. Dev server sometimes dies during long e2e runs → agents used `pnpm build && pnpm start` for e2e.
- Dev: if `next dev` hangs on "Compiling" after merges/new deps → `rm -rf .next/dev` and restart.
- Root-owned stale dir `.claude/worktrees/agent-aec2e1a718ded6454` (Docker-created) — `sudo rm -rf` it.

## How work is run (process the user asked for)
- **Two tracks per milestone** (backend / frontend) as parallel subagents in git worktrees (`isolation: worktree`); lead merges, runs the definition of done, commits **one commit per milestone on `main`, local only (no push)**.
- **Models:** Sonnet for implementation agents, Opus for planning/lead, Haiku for small atomic tasks (run tests/typecheck/lint/build, dev servers, merges with explicit steps). Lead delegates; briefs written caveman-style (agents answer terse caveman). Be credit-conscious: tight briefs, selective reading (`graft ask/skeleton`), short reports, few screenshots.
- **Context hygiene / resumability (required for every subagent):**
  - Keep a progress log at `docs/progress/<milestone>-<track>.md` in the worktree: done / in progress / next / decisions / blockers. Update it after each sub-task.
  - When context passes ~150k tokens, run compact (or, if the agent cannot, finish the current sub-task, update the progress log, commit WIP to the worktree branch `wip: …`, and stop with a short report so the lead resumes a fresh agent from the log).
  - On interruption (rate limit), the lead commits the worktree WIP to its branch so nothing is lost, and resumes with a fresh agent pointed at the same worktree + progress log.
- Agents never commit to `main`; never touch the other track's directories (backend: `src/server`, `src/contract`, `src/app/api`, `drizzle`, `scripts`; frontend: `src/app/[locale]`, `src/ui`, `src/features`, `messages`, `public`). Shape changes are proposed in the report and logged in `docs/CONTRACT.md` §10 by the lead.
- Dev ports: 4100 = user review server (main checkout); agents use their own (4200/4300/4400…).
