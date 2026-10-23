# M5 frontend progress

## Done (all pages EN + /hi, loading/empty states, metadata, 375px no h-scroll checked)
- News `/news` (LinkTabs, ArticleCard, Pagination), Article `/news/[slug]` (sanitised body, event results box, prev/next, related, EN-only notice)
- District `/districts/[slug]`, Map `/centres/map` (Leaflet + OSM, client-only, list fallback, toggle on phone, pins link to Centre, Directions)
- Programs `/programs?wing=`, Program `/programs/[type]` (steps per variant, KPIs, Funnel null = "Not reported yet", partners, Join CTA)
- Values `/values/[slug]` x5 (live facts, upcoming, discourses only when non-null, prev/next, generateStaticParams)
- About `/about` (wings, org diagram from districts index, principles, find-a-centre form, `#districts`, `#contact`)
- Join `/join` (filters, needs list, WhatsApp number + copy + QR, opt-in form with botToken, 202 neutral)
- Shell: footer links About/Programs/News (header already linked); catch-all `?moved=1` renders spec-18 "moved" variant.
- Icon registry +briefcase flower-2 gift hand languages layout-grid leaf moon shirt wind. Deps: leaflet, @types/leaflet.
- tests/m5-frontend.test.ts (directions URL, search parse, km format).

## TEMP shims (remove at integration)
- `src/features/public/dev-fixtures.ts` + the `// TEMP M5` import and `m5()` fallbacks in `src/features/public/data.ts`: values, programs (list/byType), join, districts index. Real services win automatically if present on `services()` (`values.bySlug`, `programs.list/byType`, `join.get`, `districts.list`).

## Decisions
- Editorial copy in messages (D1). Value-page prose: HI file holds the English prose; page shows "available in English only" bar + lang="en" until native Hindi lands (`HI_PROSE_READY` in `features/values/ValueView.tsx`).
- Map search box: 6 digits = pincode, else `q`; `district` slug; plain GET form (no JS needed).
- Join has no personal-data form beyond optional opt-in; number from `data.whatsapp` (env WA_DISPLAY_NUMBER / WHATSAPP_PUBLIC_NUMBER in fixture).
- About founder photo reuses `/images/values/photo-sathya.webp` (TODO(user) approved text/photo); contact block is generic (TODO(user) office phone/email, auditorium).

## NATIVE HINDI REVIEW needed (agent-written)
All new HI strings: namespaces `news`, `district`, `map`, `programs`, `program` (incl. steps/lead), `valuePage` chrome (prose is EN), `about`, `join`, footer `about/programs/news`.

## Notes for integration
- Local-only: `src/proxy.ts` DETAIL_PATH excludes `centres/map` (backend does this); not committed from this track.
- Moved-page variant returns HTTP 200 from the catch-all; proxy should set status 404 on its `?moved=1` rewrite if wanted.
- Dev: Leaflet chunk is slow to hydrate on first dev compile (not a prod issue).

## Blockers
none
