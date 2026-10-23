# M7 plan — Discourses + hardening (lead, 23 Oct 2026)

Contract: `docs/CONTRACT.md` §10 **v0.8** (zod in new `src/contract/discourses.ts`; edits in `enums.ts` (`DiscourseTheme`, `DiscourseStatus`, `DiscourseBlockStatus`), `content.ts` (`Discourse.themes` → theme keys, `quotes[].blockId`), `auth.ts` (`discourses.review`, `discourses.publish`), `endpoints.ts` (adminEndpoints v0.8 block), `index.ts`). Specs: 15, 16, 39 (+ 02 Values "related discourses"). Design: `docs/design/portal/Batch 6a Discourses public.html`, `Batch 6b Discourses admin.html`, `docs/design/public/b6-discourses.jsx`, `docs/design/portal/b6-admin.jsx`, `b6.css`; QuoteCard/QuoteImage in `docs/design/ds-additions/ext-*.jsx`.

Three tracks, each in its own worktree, each split into **runs of ≤110k tokens**. Every run keeps `docs/progress/M7-<track>.md` (done / in progress / next / decisions / blockers), updated after each task; at the end of a run (or ~110k) → update log → `wip:` commit on the worktree branch → short caveman report. Next run = fresh agent on the same worktree + log.

## Source data (inspected)

- `~/Claude/sssso-platform/discourses/translations/NN-<slug>.hi.json` × 87: `{n, title, source(html url), pdf, coll, date (free text: "1966" / "May 1972" / "04 October 1970"), place, occasion, retrieved, translated, notes[], quote_candidates[{en,hi}], blocks[{id:"s1…", type: para|heading|verse, en, hi, status:"ai_draft"}]}`. English source is inside each block (`en`); no separate EN file needed. 2491 blocks (1965 para, 399 heading, 127 verse), 0 missing. `verse` → `poem`.
- `catalog.json`: `rows[{n, title, coll, html, pdf, theme (free text), why}]` (87) + `themes{ "<catalog heading>": [n…] }` (14) → `DISCOURSE_THEMES[*].catalog` maps heading → key. `why` is EN only (hi null).
- `glossary.json`: `{_note, terms{term: hi}}` (no gloss) → `GlossaryTerm{gloss:null}`.
- `media/index.json`: per n `{status, audio[], videos[]}` — **not used in M7** (backlog).
- `credits.json`: translation rights need written permission from the Trust → flag stays **off** in prod; nothing public until the user says so.
- Text is copyrighted: **never commit discourse text**. Import reads `DISCOURSES_DIR` (default `~/Claude/sssso-platform/discourses`). Mock fixtures/tests use 2–3 synthetic placeholder discourses.

## Gap analysis (state at `0f0678a`)

| Area | Contract | DB / service / API | Frontend |
|---|---|---|---|
| Public list (15) | `Discourse`, `DiscourseSummary`, endpoint builders existed; **new** `DiscoursesQuery/Payload`, `DiscourseCard`, `DISCOURSE_THEMES`, `DISCOURSE_CREDIT` | none (no tables; flag read in `services/shared.ts`) | nav item gated in `SiteHeader` (prop); no route |
| Public detail (16) | **new** `DiscourseDetail` (related, value, translation, credit) | none | none; QuoteCard exists? (check `/dev/ui`) |
| Values (02) | `ValuePayload.discourses` ≤3 / null; **new** `VALUE_DISCOURSE_THEMES` | `services/values.ts` returns `[]` when flag on | `ValueView` renders section |
| Workspace (39) | **new** admin row/detail/patch/actions/glossary + helpers `glossaryIssues`, `quoteMatches`, `approveBlockers`, `publishBlockers`; perms `discourses.review/publish` | none; role `translator` has `discourses.edit` only | placeholder page; nav gated `discourses.edit` |
| Flag | `SettingsPatch.flags.discourses` exists (M6) | settings service + audit exist | Settings toggle exists |
| a11y/perf | — | — | unchecked: axe, keyboard, focus, contrast, 375px, `/hi`, image sizes, bundle; M6 pages only smoke-tested |
| e2e | — | — | none. `@playwright/test` **not installed**; browsers cached in `~/.cache/ms-playwright` (chromium-1228/1229/1248) |

## Backend track (`src/server`, `src/app/api`, `drizzle`, `scripts`, `src/proxy.ts`; contract read-only)

### Run B1 — schema, import, public
1. **Migration `0008_m7_discourses.sql`** + drizzle schema: `discourse` (id ulid, n unique, slug unique, title_en/hi, why_en/hi, coll_print, coll_online, date_text, iso_date, place, occasion, source_url, pdf_url, retrieved, themes json, status, reviewer_id, notes json, quotes json, published_at, published_snapshot json (blocks+quotes at publish), version, timestamps); `discourse_block` (discourse_id, block_id, idx, type, en, hi, hi_ai (imported draft), status; unique (discourse_id, block_id)); `discourse_glossary` (term pk, hi, gloss). Mock repo + 3 synthetic fixtures.
   Accept: `pnpm db:migrate` clean on fresh + existing DB; legacy tables untouched.
2. **`scripts/import-discourses.ts`** (`pnpm db:import-discourses`, idempotent upsert by `n`; `--dir`, `--dry-run`): slug from file name (`01-students` → `students`; clash → `-n`); themes from catalog; `why` from catalog; quotes = first ≤4 `quote_candidates`, `blockId` = first block whose `en` contains the quote (else null); `hi` and `hi_ai` = file hi, block status `ai_draft`, discourse status `ai_draft`; never overwrite a block whose status is `edited`/`approved` (re-import safe); glossary upsert; `isoDate` only for full dates. Seed (`db:seed`, dev only): when the dir exists, import, then mark 3 discourses fully approved + `published` (so pages work once the flag is toggled); flag stays off. Add to `db:reset`.
   Accept: 87 rows / 2491 blocks; re-run = 0 changes; edited block survives re-import; missing dir → clear message, exit 0 in seed.
3. **Public services + routes**: `GET /discourses` (`DiscoursesQuery` → `DiscoursesPayload`), `GET /discourses/:slug` (`DiscourseDetail`, from `published_snapshot`) — 404 when flag off or not published; `related` = same-theme published ≤3; `value` via `VALUE_DISCOURSE_THEMES`; featured quote deterministic per IST day. `services/values.ts`: fill ≤3 published matches. Cache tag `discourses` (+ `revalidateTag` on publish/unpublish/flag change). Proxy existence probe for `/discourses/<slug>` (like events/centres) so unknown slug / flag off → real 404.
   Accept: flag off → both 404 (API + page probe); `q` matches Hindi title; values payload ≤3.

### Run B2 — workspace API
4. `GET /admin/discourses` (`AdminDiscoursesQuery` → `Paged<AdminDiscourseRow>` + `AdminDiscoursesMeta`), `POST` (`DiscourseCreate`, split on blank lines; `#`-prefixed lines → heading), `GET/PATCH /admin/discourses/:id` (`DiscoursePatch`, optimistic version → 409; `quoteMatches` → 422 `fields.quotes.<i>`; `status: approved` per block needs `discourses.review`; glossary issues computed server-side), `GET /admin/discourses/glossary`, actions `ai-draft | send-review | approve | publish | unpublish` (`approveBlockers`/`publishBlockers` → 422 with `fields`); publish writes `published_snapshot`, `published_at`. All mutations audited (`discourse.*`).
   RBAC: translator += `discourses.review`; content_editor += `discourses.edit`, `discourses.review`, `discourses.publish`; state all. Translators have no org scope (null) — scope checks skip.
   Accept: flag off → publish 422 `flag_off`; approve with an `ai_draft` block → 422 `blocks`; editing a published discourse keeps public text unchanged until re-publish; tests (mock + db integration).

## Frontend track (`src/app/[locale]`, `src/ui`, `src/features`, `messages`, `public`)

### Run F1 — public discourses
1. `/discourses` (spec 15): hero + credit line, theme chips (URL `?theme`), search (`?q`, debounced, server-rendered results), cards, featured quote card with share. Flag off → `notFound()`; header nav item from flags.
2. `/discourses/[slug]` (spec 16): breadcrumb, meta, theme tags, language switch (HI default under `/hi`; `?lang=en|hi|both`, side-by-side ≥1024px), 66ch reading layout, headings, `poem` italic set apart, quote cards with **Share as image** (client canvas 1080×1080, brand QuoteImage, EN/HI; `navigator.share` with file, else download), translation note + "Report a correction" (→ `/privacy#contact` until a feedback route exists), related + value link. `lang` attribute on Hindi blocks.
3. Values page: render `discourses` cards when non-null.
   Accept: works fully in `/hi`; credit visible; 375px no overflow; quote PNG renders Devanagari (font loaded before draw).

### Run F2 — workspace
4. `/admin/discourses` list (spec 39 / b6-admin.jsx DiscList): flag bar when off, status KPI tiles from `meta.counts`, filters (q, theme, status, reviewer), table, row menu (open, AI draft, assign reviewer), "Add to shortlist" dialog (`DiscourseCreate`), glossary drawer.
5. `/admin/discourses/[id]` editor: aligned rows (paragraph no., EN read-only, HI editable textarea `lang="hi"`), per-block status pill + "Approve paragraph" (if `can.review`), glossary highlights + mismatch notes (client `glossaryIssues` on edit), autosave PATCH with version (409 → reload banner), metadata panel, quote picker (select text in an EN block → "Make quote card", preview, export EN/HI PNG via the F1 canvas helper), workflow buttons with blocker tooltips ("Publishing opens once permission is granted"). Keyboard: Alt+↓/↑ next/prev paragraph.
   Accept: alignment visible at 1280 and stacked at 375; publish gate explained; translator sees no other nav items.

### Run F3 — a11y/perf fixes (after QA run Q1 produces `docs/progress/M7-a11y-findings.md`)
6. Fix every **serious/critical** axe finding + keyboard/focus/contrast/overflow items from the findings file, public + portal + `/f`. Images: `next/image` with sizes for legacy media where dims known; lazy below fold; lotus GLB lazy (already?) and `prefers-reduced-motion` respected. Re-run `pnpm e2e:a11y` until clean.
   Accept: a11y suite green; budgets in `tests/e2e/budgets.ts` pass.

## QA track (`tests/e2e/**`, `playwright.config.ts`, `package.json` scripts/devDeps only; may add `data-testid` **requests** to the report, not edit app code)

Deps (lead installs before the run, needs network): `pnpm add -D @playwright/test @axe-core/playwright` then `pnpm exec playwright install chromium` (skips if the matching revision is cached). Specs are `*.spec.ts` under `tests/e2e/` (vitest includes only `*.test.ts`). Config: two webServers/projects — **journeys + a11y** against `pnpm dev --port 4500` (env `DATA_SOURCE=db`, `WHATSAPP_PROVIDER=console`; dev-only endpoints live), **perf** against `pnpm build && pnpm start --port 4600` (public routes only, no OTP needed). `globalSetup` = `pnpm db:seed` (reset DB state). Projects `chromium-desktop` (1280) + `mobile` (375×812); `workers: 1` for DB-mutating specs. OTP: console WhatsApp provider logs every outbound message (OTP text included) to `whatsapp_message` → read via existing dev endpoint `GET /api/v1/dev/whatsapp/messages?phone=` (`devWhatsappEndpoints.messages`, 404 in production) and regex the 6-digit code.

### Run Q1 — tooling + audit
1. Config, scripts `e2e`, `e2e:a11y`, helpers (`login(page, role)`, `formLinkLogin`, `axeCheck(page, {exclude})`, `noHorizontalOverflow(page)`), route list (all public pages EN+HI incl. sample slugs from seed; all `/admin/*` pages as state admin; `/f/<seed token>` steps).
2. `a11y.spec.ts`: axe (wcag2a/aa, best-practice off) per route × locale × viewport; `html[lang]` correct (`hi` under `/hi`); no horizontal overflow at 375; every page has one `h1`, a skip link, visible focus on Tab (sample: first 10 tabbables have non-none outline/box-shadow); images have alt; no console errors.
3. `perf.spec.ts` budgets (`budgets.ts`): per public route JS transferred ≤ 250 KB gz (home ≤ 450 KB incl. three.js, lazy), LCP ≤ 2.5 s on desktop localhost, no image > 300 KB transferred, CLS ≤ 0.1 (PerformanceObserver).
4. Run, write **`docs/progress/M7-a11y-findings.md`** (route, rule, impact, selector, fix hint) — input for F3. Tests for known failures marked `test.fail()` with a link to the finding.
   Accept: `pnpm e2e:a11y` runs end-to-end; findings file committed.

### Run Q2 — journeys
5. `public.spec.ts`: home → calendar → filter → event → centre; `/hi` same path shows Hindi; news → article; join opt-in form validation; legacy redirect (`/post/<legacy-id>` style from seed `redirect` rows → 301 target); unknown event → 404.
6. `form-link.spec.ts`: `/f/<seed eye-report token>` → phone 9000000001 → OTP → fill → submit → done; reopen → gone/done state; offline draft (context.setOffline) survives reload.
7. `portal.spec.ts`: login (OTP) → plan event → submit; district coord approves in Approvals; inbox item approve (seed item); upload wizard with `tests/e2e/fixtures/upload-sample.xlsx` (generated in test via exceljs from `template.xlsx`) → preview → confirm → appears in Approvals; content: create article → publish → visible on `/news`; settings flag `discourses` on → `/discourses` 200 → off → 404 (after backend B1).
   Accept: `pnpm e2e` green on clean seed (two consecutive runs); runtime < 6 min.

## Order / parallelism
1. Lead: install deps (Playwright) on main before spawning QA.
2. Parallel: **B1**, **F1** (against mock fixtures), **Q1**.
3. Then **B2**, **F2**, **Q2** (Q2's discourse step after B1 merge).
4. Lead merges B1+F1 → B2+F2 → Q*; then **F3** on merged main-based worktree; lead re-runs `pnpm e2e`.

## Definition of done
`pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm e2e` green; walkthrough of `/discourses` (flag on locally), workspace edit → approve → publish, `/hi`. One commit on `main` for M7.

## Decisions (defaults; TODO(user) where marked)
- Public shows only `published` discourses, flag on. Prod flag stays off until written permission from the Trust (TODO(user)).
- "Request AI draft" restores the imported (offline Claude-made) draft — no live LLM on the server.
- Quote images are generated client-side (canvas); no server image endpoint.
- Theme mapping and `VALUE_DISCOURSE_THEMES` fixed in contract; adjust later in code if reviewers want.
- `why` Hindi missing for all 87 → cards show EN `why` with `lang="en"` until translated in the workspace.
- Reviewer group name for the translation note: setting-free constant null → note hidden until TODO(user) supplies it.
- Audio/video (`media/index.json`) out of scope (backlog).

## Risks
- Large text in RSC payloads (some discourses ~60 blocks): render detail as server component; client islands only for language switch/share.
- Devanagari in canvas needs the webfont loaded (`document.fonts.load`) before drawing.
- E2E OTP retrieval depends on the dev WhatsApp log endpoint (dev server only); flakiness from in-process rate limits → reset via seed + per-test unique phones where possible.
- Cache Components: flag toggle must `revalidateTag('discourses')` and the proxy probe cache (60 s) — e2e waits/clears.
