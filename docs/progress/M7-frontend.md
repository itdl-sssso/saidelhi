# M7 frontend progress

## Run F1 (public discourses) — done
- `/discourses` list (hero, credit, featured quote + share, debounced `?q` search, `?theme` chips, cards, empty state, loading) and `/discourses/[slug]` (breadcrumb, meta, `?lang=en|hi|both` switch, side-by-side >=1024px, 66ch prose, poem/heading/quote blocks, quote cards + Share as image, translation note, report link -> `/privacy#contact`, related + value link).
- Flag off -> `notFound()`; nav item gated via `HeaderWithFlags` in `(public)/layout.tsx` (`getDiscourseFlag`).
- Client canvas quote image `src/features/discourses/quote-image.ts` (1080x1080, fonts awaited with allSettled so a failed font never blocks; navigator.share with file else download). Reusable by F2.
- Icons added: download, library, share-2. Strings: `discourses` namespace EN+HI (HI needs native review).
- Values page already renders `discourses` cards (M5).

## Next / notes
- Free-text `date` shown as is (no HI localisation).
- Related cards omit "why" (summary only).
- Proxy 404 probe for `/discourses/<slug>` is backend (B1).

## Run F2 (workspace) — done
- `/admin/discourses` list (`DiscoursesList.tsx`): flag bar, KPI tiles, filters, table, row menu (AI draft, assign reviewer; hidden by `can.*`), shortlist dialog, glossary drawer.
- `/admin/discourses/[id]` editor (`DiscourseEditor.tsx`): aligned EN/HI rows, per-block approve (`can.review`), glossary issues, autosave w/ version (409 toast reload), quote picker + PNG export, workflow buttons (send-review/approve/publish gated by `can.*` + `publishBlockers`).
- Merged main (B2). All TEMP M7 fixtures removed (admin api.ts fx/fixtureMode, public data.ts now `services().discourses`). Nav item gated `discourses.edit`. SectionPlaceholder gone.
- DoD: tsc, lint, test (363) green. `pnpm typecheck` segfaults in `next typegen` (env flake); `tsc --noEmit` clean.

## F2 next
- Browser check at 375px and `/hi` against real DB not done by this resume (no dev server run).
