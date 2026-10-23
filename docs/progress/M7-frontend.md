# M7 frontend progress

## Run F1 (public discourses) — done
- `/discourses` list (hero, credit, featured quote + share, debounced `?q` search, `?theme` chips, cards, empty state, loading) and `/discourses/[slug]` (breadcrumb, meta, `?lang=en|hi|both` switch, side-by-side >=1024px, 66ch prose, poem/heading/quote blocks, quote cards + Share as image, translation note, report link -> `/privacy#contact`, related + value link).
- Flag off -> `notFound()`; nav item gated via `HeaderWithFlags` in `(public)/layout.tsx` (`getDiscourseFlag`).
- Client canvas quote image `src/features/discourses/quote-image.ts` (1080x1080, fonts awaited with allSettled so a failed font never blocks; navigator.share with file else download). Reusable by F2.
- Icons added: download, library, share-2. Strings: `discourses` namespace EN+HI (HI needs native review).
- Values page already renders `discourses` cards (M5).

## TEMP M7 shims
- `src/features/discourses/dev-fixtures.ts` placeholder discourses; `data.ts` uses `services().discourses` (`list(q)` -> DiscoursesPayload|null, `bySlug(slug)` -> DiscourseDetail|null) when present, else fixtures (only when flag on). Remove fixtures + the `backend()` cast once backend B1 merges; align method names.

## Next / notes
- Free-text `date` shown as is (no HI localisation).
- Related cards omit "why" (summary only).
- Proxy 404 probe for `/discourses/<slug>` is backend (B1).
