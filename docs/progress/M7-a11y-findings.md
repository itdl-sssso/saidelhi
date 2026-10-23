# M7 a11y / perf findings (Q1)

Source: `pnpm e2e:collect` (dev server :4400, DB seed), 232 audits = 58 routes x {en,hi} x {desktop 1280, mobile 375}; all public (incl. `/discourses`, `/discourses/students`), all `/admin/*` (state admin), `/admin/login`, `/f/*` (5 states). Raw: `tests/e2e/.cache/{issues,coverage}.jsonl` (gitignored). Counts = issue rows across the 4 project/locale combos unless noted.
All tolerated in `tests/e2e/known.ts` by finding id; F3 removes entries as it fixes. Checks: axe wcag2a/aa, html[lang], one h1, skip link, focus-visible (first 10 tabbables), img alt, console errors, overflow-x @375, HTTP status.
Clean: html-lang, img-alt, overflow-x at 375 (zero hits), no late navigation.

## Functional bug (not a11y), fix first
**A13 `/admin/events/new` returns HTTP 404** (all 4 combos). `src/proxy.ts:16,129`: regex `\/admin\/events\/([^/]+)` treats `new` as an event id, existence probe fails, 404. Plan-event page unreachable via direct load. Fix: skip probe when segment is `new` (like `centres/map`). Also yields console-error 404. Q2 `portal.spec` plan-event step depends on this.

## Serious / critical
| id | rule | impact | count | routes | source | fix |
|---|---|---|---|---|---|---|
| A1 | axe color-contrast | serious | 177 (45 paths) | all pages with primary `Button` (public NavBar CTA, admin actions/rows, `/f/*`); also `.Parts-module tfoot` (muted text on sand, admin tables, 8), `.formlink-module eventMeta:nth-child(2)` (8), small primary buttons in article footers | `src/ui/Button/Button.module.css:42` `.primary` = `--action-primary` (pink-200) bg + `--action-primary-text` (pink-700) from `design-system/tokens/colors.css:48-51`; `src/features/admin/Parts.module.css:11` `.tfoot`; `src/features/formlink/ui/formlink.module.css` eventMeta | Darken `--action-primary-text` (or bg) to >=4.5:1; `--text-muted` on `--sand` >=4.5:1. Token fix covers most (one change, biggest win). Verify with axe detail for exact ratio. |
| A2 | axe label-content-name-mismatch | serious | 143 (52 paths) | every page: `.NavBar brand` (public, 22), `.Shell prof` (admin top bar, 120), one map-list link `a[aria-label="मध्य: 1 गतिविधि"]` (hi `/calendar`?) | `src/ui/NavBar/NavBar.tsx:108` (aria-label=t("home") differs from visible brand text), `src/features/admin/AdminShell.tsx:153` (aria-label=shell.profile vs visible name/role) | Make accessible name contain visible text: e.g. aria-label = `${visible brand text}` / include `me.user.name` in label, or drop aria-label. For the district link include the visible text prefix. |
| A8 | axe aria-required-children | critical | 4 | `/admin/org` | `src/features/admin/org/OrgManager.tsx:181` `ul role=tree` > `li role=none` > treeitem; li inside group ok; likely empty tree/`role=none` li wrapper not allowed as direct child chain | Ensure tree children are `treeitem`s (li role=none wrapping is valid only with `role=group` parents); check empty-state or non-treeitem children (buttons) inside. |
| A10 | axe label | critical | 3 (hi-desktop, mobile en/hi) | `/admin/centres/<id>` | `src/features/admin/centres/CentreEditor.tsx:174` `input#centre-photo` sr-only file input without label | add `<label htmlFor="centre-photo">` or aria-label. |
| A5 | axe link-name | serious | 8 (mobile only) | `/calendar`, `/news`, `/admin/events`, `/admin/content` | `src/ui/Pagination/Pagination.tsx:68` (`rel="next"`; label hidden on mobile, no aria-label; prev likely same pattern at :37) | add `aria-label` to prev/next links (visible text hidden at 375). |
| A9 | axe aria-command-name | serious | 3 | `/admin/centres/<id>` | `.leaflet-marker-icon` in centre editor map (`src/features/map/CentreMap.tsx:49` has title/alt; editor map marker lacks) | give editor marker `title`/`alt` + `role=button`+aria-label. |
| A7 | axe definition-list | serious | 4 | `/admin/health` | `src/features/admin/health/HealthPage.tsx:62` `<dl>` direct children not only dt/dd groups | wrap tiles per `<div><dt/><dd/></div>` only; remove other children. |
| A11 | axe scrollable-region-focusable | serious | 2 (mobile) | `/admin/reports` | `Admin.module.css .tblScroll` wrapper (Reports table) | `tabIndex={0}` + role=region + aria-label on scroll wrapper (also in Links/Impact/Partners). |
| A6 | axe link-in-text-block | serious | 4 | `/` | `src/features/home/HomeSections.tsx:406` privacy link in `.fine` text | underline link (text-decoration) or contrast 3:1 vs surrounding. |
| A4 | focus-visible | serious | 14 | mobile: `/calendar`, `/values/{sathya,dharma,prema,shanti,ahimsa}` (cards `a` with no outline), desktop+mobile `/f/<token>/form` (`input#f-date`) | `src/features/values/ValueView.tsx`, calendar event cards (`src/ui/EventScheduleCard`), `src/ui/DateField` | Add `:focus-visible` outline (global rule or component); DateField input inner element has no outline/shadow. |

## Moderate
| id | rule | count | routes | source | fix |
|---|---|---|---|---|---|
| A3 | skip-link: first Tab not an in-page anchor | 24 (6 paths) | `/admin/login` (first tab = "Send code on WhatsApp" button), `/f/<token>`, `/f/<token>/form`, `/f/<token>/done`, expired link (first tab = language link "हिंदी") | formlink layout (`src/features/formlink/...`), `src/features/admin/login/*` | Add skip link as first focusable in form-link and login layouts, targeting `#main`. |
| A12 | single-h1: 0 visible h1 | 5 | `/f/<token>/done`, `/admin/centres/<id>` (EN desktop x2, others 1) | done page `src/features/formlink/...`, CentreEditor | add visually-visible h1 (done heading; centre name). |
| A13 | console-error | 8 | `/admin/events/new` (404, see above), `/f/<expired token>` 410 Gone resource (expected network 410 from token probe; ignore pattern or probe without console error) | `src/proxy.ts`; formlink gone state | fix proxy; for 410 either accept (add to IGNORED_CONSOLE in a11y.spec) - Q2 decision. |

## Perf (budgets in `tests/e2e/budgets.ts`; `next build && next start` :4400, `E2E_COLLECT=1 pnpm e2e:perf`, desktop, 20 public routes)
- JS gz: all within budget. Home 357 KB (budget 450); max other 230 KB (`/values/prema`, budget 250), `/values/shanti` 219, `/discourses` 193.
  Margin on values pages thin (~20 KB).
- LCP: all <= 1.2 s (map 1168 ms, home 768 ms). No image > 300 KB.
- **P1 CLS > 0.1, intermittent**: `/about` 0.263, `/centres/map` 0.258, `/values/*` 0.263 (which of the 5 varies per run: run1 dharma/shanti/prema, run2 prema/ahimsa). Same 0.263 value on several pages = shared element (footer / webfont swap / late-loaded component). Home 0.074 and `/impact` 0.075 pass but near budget. Tolerated via `KNOWN_PERF` (cls). F3: find via PerformanceObserver layout-shift sources; reserve space / `font-display`+size-adjust.
- Build note: `pnpm build` initially failed typecheck on stale route types in worktree; `pnpm typecheck` (runs `next typegen`) fixed it, build then passes.

## Notes for F3
- Priority: A1 (token), A2, A13, A5, A4, A10, A8, then rest. After each fix remove its id from `tests/e2e/known.ts`; `pnpm e2e:a11y` must stay green, finally KNOWN = {} and KNOWN_PERF = {}.
- known.ts is keyed per path (any project/locale), so a fix is only proven when entry removed and suite green in all 4 combos.
- Full run ~17 min. Single route: `pnpm e2e:a11y -g "en /admin/org"`.
- Hindi: no HI-only axe finding beyond A2 hi link. No color-scheme / reduced-motion checks implemented (backlog).
