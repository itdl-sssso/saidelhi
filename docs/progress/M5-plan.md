# M5 plan — Public P1 + legacy migration (lead, 23 Oct 2026)

Contract: `docs/CONTRACT.md` §10 **v0.6** (zod in `src/contract/public.ts`, `redirects.ts`, edits in `content.ts`, `impact.ts`, `queries.ts`, `endpoints.ts`). Specs: 02, 03, 05, 06, 07, 08, 11, 12, 13 (+18 "moved" 404, 41 redirects table). Design: `docs/design/public/b4-*.jsx` + `Batch 4 Public P1.html`, `docs/design/wireframes/value-page.jsx` + `Value *.html`, `map-page.jsx` + `Map.html`, `Article(s).html`.

Each track keeps `docs/progress/M5-<track>.md` (done / in progress / next / decisions / blockers), compacts or stops at ~150k context.

## Gap analysis (state at `9020021`)

| Page (spec) | Contract | Service + API (mock / db) | Frontend page |
|---|---|---|---|
| Value ×5 (02) | **new** `ValuePayload`, `VALUE_LINKS` | none; `endpoints.value` only | none (catch-all 404) |
| About (03) | **new** `DistrictSummary`, `GET /districts` | `districts.units` exists; no summary | none |
| Programs (05) | **new** `ProgramCard`, `ProgramsQuery` | none | none |
| Program (06) | **new** `ProgramDetail`, `ProgramParams` | none (KPI calc reusable: `services/impact-calc.ts`, `domain/kpi.ts`) | none |
| News (07) | `Article`, `ArticlesQuery` (exists) | ✅ `services/articles.ts` + `/api/v1/articles` (mock + db via legacy tables) | none |
| Article (08) | `ArticleDetail` (exists) | ✅ `/api/v1/articles/[slug]` | none |
| Join (11) | **new** `JoinPayload`, `JoinQuery`, `WhatsAppContact` | none (events query `needsVolunteers` exists) | none |
| Map (12) | `CentreListItem` (exists) + **new** `pincode` query | ✅ `/api/v1/centres` (no pincode/distance) | none |
| District (13) | `DistrictPayload` + **new** `demographics` | ✅ `/api/v1/districts/[slug]` (`demographics: []` stub) | none |
| Redirects (18/41) | **new** `legacyRedirect`, `isLegacyPath`, `RedirectQuery/Target` | none; no `redirect` table | catch-all 404 has no "moved" variant |
| Legacy import | — | `scripts/import-legacy.ts` loads dump; `article_i18n` side table exists (no district tags, Hindi empty) | — |

Legacy Django routes (`../saidelhi org/saidelhiweb/urls.py`): `/about-us/`, `/contact-us/`, `/get-involved/`, `/wings/<Spiritual|Service|Education>/`, `/content/<CategoryName>/getallposts/` (first letter = category: C/D centenary, P stories, S special, A activities, K key, N news; O = hidden), `/content/<slug>/`, `/book-auditorium/`, `/saidelhi-backend/` (Django admin), `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/media/*` (kept).

## Backend track (`src/server`, `src/app/api`, `drizzle`, `scripts`, `src/proxy.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`; `src/contract` read-only)

Order:
1. **Values** — `ValuesService.bySlug(slug)` (mock + db): prev/next from `VALUE_ORDER`; `lived` from `VALUE_LINKS`; `facts` = count of active centres with a `VALUE_LINKS[slug].gathering` gathering (`key:'centres'`) and/or this-year headline figure for `sevaType` (reuse `impact-calc`); `upcoming` = next 3 `/events` rows of `sevaTypes` (gathering rows allowed); `discourses` = `null` when flag off else `[]` until M7. Route `GET /api/v1/values/[slug]` (bad slug → 400 → page 404).
   Accept: all 5 slugs return; flag off → `discourses:null`; sathya prev = ahimsa.
2. **Programs** — `ProgramsService.list({wing})` / `byType(type)`: active `seva_type` rows by `sort_order`; `next` = earliest public non-recurring planned/postponed event; `thisYear` = one headline figure (eye: screened, blood: units, narayan: meals, bal_vikas: children…) from approved KPIs this year, `null` if none. Detail: 3–4 `KpiTile` this year (estimates labelled), `funnel` for eye (found → referred → operated; unreported → `value:null`) and medical only if follow-up data, `upcoming` ≤6, `articles` ≤3 (article_i18n.event_id → events of this type, else category key_programs), `partners` (distinct partners on events of type; fallback by kind: eye/medical→hospital, blood→blood_bank). Routes `GET /programs`, `GET /programs/[type]` (inactive/unknown → 404).
   Accept: eye funnel shows null not 0 for unreported; `wing` filter works; mock fixtures cover eye + blood + narayan.
3. **Join** — `JoinService.get(q)`: events public, non-recurring, planned|postponed, `volunteersNeeded > volunteersJoined`, from today IST, filters district/sevaType/from/to, paged (12). `whatsapp` from env `WA_DISPLAY_NUMBER` (digits → `https://wa.me/<digits>?text=JOIN`), keyword `JOIN` (confirm bot flow accepts "join"/"hi"; add keyword if missing in `server/whatsapp` flows). Route `GET /join` (`JoinQuery`).
   Accept: no number configured → `number:null, waMeUrl:null`; filters combine; recurring rows excluded.
4. **Districts** — `districts.list()` → `DistrictSummary[]` (+ route `GET /api/v1/districts`). Fill `DistrictPayload.demographics` from KPI dimensions (age/gender) with `<5` suppression via existing public-count helper; `[]` when no dims.
5. **Centres pincode** — static NCR pincode → lat/lng table (`src/server/data/ncr-pincodes.json`, source GeoNames IN, CC-BY — attribution in file header; Delhi 1100xx, Gurugram 1220xx, Noida/Ghaziabad 2013xx/2010xx, Faridabad 1210xx); haversine `distanceKm` (1 dp), sort nearest first; unknown pincode → nulls. Also `q` matches locality/address/name. Seed realistic `geo` for seeded centres (needed by map pins).
6. **Redirects** — migration `0005_m5_public.sql`: `redirect` (`from_path` PK varchar(500), `to_path`, `permanent` bool, `source` enum rule|manual|migration, `hits` int, timestamps). `RedirectsService.resolve(path)`: table row first (cached 5 min), then `legacyRedirect()`. Route `GET /redirects?path=`. `src/proxy.ts`: if `isLegacyPath(pathname)` → resolve → `NextResponse.redirect(url, 301|302)` (EN, unprefixed); no match → rewrite to `/en/__not-found?moved=1` (frontend shows spec 18 "This page moved"). Bump `hits` fire-and-forget.
   Proxy 404 probes: extend `DETAIL_PATH` to `news/[slug]` (`articles.bySlug`), `districts/[slug]`, `programs/[type]`, `values/[slug]` (enum check, no DB); **exclude `centres/map`** from the centre probe (else `/centres/map` 404s). Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` first.
7. **Legacy import polish** (`scripts/import-legacy.ts` or new `scripts/legacy-polish.ts`, run by `db:import-legacy`): (a) district tagging into `article_i18n.district_id` by matching district names/aliases in `badge_tag` + title (only fills null; log counts only — dump has personal data); (b) body HTML: rewrite absolute `https?://(www.)?saidelhi.org/media/…` and relative `media/…` to `/media/…`, drop empty `<p>`, strip inline styles (sanitiser already; add test with legacy samples); (c) category `O` never public; (d) cover/gallery `Media.width/height` via `image-size` on `MEDIA_ROOT` files, cached in a side table or computed at import into `article_media_meta` (optional — skip if time-boxed; null stays valid); (e) seed `redirect` rows for every legacy post slug that changed (none expected — slugs reused) and for category list URLs (source `migration`).
8. **SEO** — `src/app/sitemap.ts` (all public pages EN + `/hi` alternates, articles, events (approved/planned), centres, districts, programs, values) and `src/app/robots.ts` (disallow `/admin`, `/f/`, `/api`, `/dev`). Read `…/01-metadata/sitemap.md`, `robots.md` (Cache Components compatibility). `llms.txt`: optional static (Q8).
9. Tests: `tests/m5-public.test.ts` (mock services: values, programs, join, districts list, pincode distance, redirects rules incl. all Django patterns + trailing slash + case), db integration for programs/join/redirect table. Update `tests/contract.test.ts` for new endpoint builders.

## Frontend track (`src/app/[locale]`, `src/ui`, `src/features`, `messages`, `public`)

Pages read services in RSC (`services()`), same DTOs; client islands call `endpoints.*`. Each page: EN + HI, 375px, breadcrumb, shared footer, loading skeleton, empty state, `generateMetadata`. Until backend lands, build against mock (`DATA_SOURCE=mock`) — services missing at start: stub nothing; coordinate by contract only, start with pages whose services exist (News, Article, District, Map) then Values/Programs/Join.

Order:
1. **News** `/news?c=` (07) — `features/news`: category Tabs (all · news · activities · centenary; other valid `c` values show "All" tabs + category chip), 12/page grid with image slot, badge, date, district, `Pagination`. Empty → "Nothing here yet." No "older news" note (all migrated; Q9).
   Accept: migrated cards identical to new; `?c=` in URL; bad `c` → all.
2. **Article** `/news/[slug]` (08) — breadcrumb Home › News › <category>, title/date/district badge/reading time, sanitised body (`dangerouslySetInnerHTML` of server-sanitised HTML, styled prose 66ch, images responsive), gallery, linked event results card ("115 screened · 63 spectacles" from `event.results.tiles`) → Event, prev/next, related (3), "See the calendar". `/hi` with `bodyHtml.hi:null` → EN body + notice "This article is available in English only".
3. **District** `/districts/[slug]` (13) — breadcrumb Home › About › Districts(`/about#districts`) › name; hero (name, samithi count, intro); KPI tiles (estimate label); by-seva-type; demographics bars (Lt5 shown "fewer than 5"); upcoming (EventScheduleCard); centres list → Centre; "All districts" → Impact. `kpis:null` → empty state.
4. **Map** `/centres/map` (12) — search (pincode or locality) + district select (`/org/units`), list (name, district, next gathering, distance, "Directions" → `https://www.google.com/maps/dir/?api=1&destination=<lat,lng|address>` new tab, → Centre). Map: Leaflet + OSM tiles (`leaflet` npm, client-only dynamic import, pins → Centre, keyboard focusable markers), desktop map left/list right, phone list first + "Show map" toggle. List fully works without JS map. No geolocation. Add `leaflet` + `@types/leaflet` (Q3).
5. **Programs** `/programs` (05) — wing Tabs (`?wing=`), SevaCard grid 3-up/1-up with icon, one-line description (messages, keyed by sevaType), "Next: 26 Oct · Noida", "This year: …"; CTA band → Join.
6. **Program** `/programs/[type]` (06) — breadcrumb; hero (name, paragraph, wing badge, image slot); "What happens" 3–4 steps per variant (eye, blood (+eligibility box), medical, narayan_seva, bal_vikas, generic) in messages; KPI tiles; funnel (`ui/Charts` Funnel; null → "—"); upcoming; recent reports; partners as text; CTA "Volunteer at a camp" → `/join?sevaType=<type>`.
7. **Values** `/values/[slug]` ×5 (02) — recreate `wireframes/value-page.jsx`: breadcrumb, hero (EN + Sanskrit name, gloss, QuoteCard), strands, prose 66ch, "Lived through" card (`lived` → `/programs/<sevaType>` or `/programs`), practice block + live `facts`, teachings QuoteCards, upcoming 2–3 EventScheduleCards, discourses section only when `discourses !== null` (no gap), prev/next nav, shared footer (remove old "Bhajan timings / Plan a visit" footer). Copy from design into `messages` (`values.<slug>.*`); HI where design has it, else EN + "Available in English only" notice (Q7). `generateStaticParams` for 5 slugs.
8. **About** `/about` (03) — hero, founder (image slot), five wing cards → `/programs?wing=`, "How we're organised" diagram NCR → districts (from `GET /districts`, links → District, samithi counts) → samithis, principles (free, all faiths, no collection), "Find a centre near you" → Map, `id="contact"` block (placeholder until Q5), `id="districts"` anchor. No donation ask.
9. **Join** `/join` (11) — hero "Offer your hands", filters (district, seva type, date range; URL params), events needing volunteers (count + progress) → Event, "Tell me about future seva": number text + Copy button + QR (`qrcode` pkg, from `whatsapp.waMeUrl`), `number:null` → "WhatsApp number coming soon"; "What to expect" points; Privacy link. **No personal-data form** (Q1).
10. **Shell / 404** — NavBar + footer links to About, Programs, News, Join, Map (replace old `#act2`/`#seva` anchors); catch-all 404: when `searchParams.moved` or `isLegacyPath(path)` show "This page moved when our site changed" + search/links (spec 18). Home links (wings, news teaser) point at new routes.
11. `/dev/ui` additions only if new UI components (e.g. `MapPins`, `Funnel` if missing). Tests: `tests/public-format.test.ts` additions for helpers (directions URL, "Next:" formatting, wa.me copy).

## Definition of done
`pnpm typecheck && pnpm lint && pnpm test && pnpm build` green (run `pnpm db:seed` before tests if DB mutated); every M5 page renders EN + `/hi` on `DATA_SOURCE=db` and mock; 375px check; legacy URLs (`/about-us/`, `/content/News/getallposts/`, `/content/<real-slug>/`, `/wings/Service/`) 301 correctly; unknown `/news/x`, `/districts/x`, `/programs/x`, `/values/x` → HTTP 404; `/centres/map` → 200. Lead merges both tracks, walkthrough, one commit on `main`.

## Decisions taken (defaults; revisit if user disagrees)
- D1 Editorial copy (values, about, programme text/steps) in `messages`, not DB/API.
- D2 Join has no form; bot contact only (spec 11 wins over handoff note "Join consumes /whatsapp/optin"). Opt-in endpoint stays for the bot/Calendar.
- D3 Map = Leaflet + public OSM tiles with attribution.
- D4 Pincode distance from a static GeoNames NCR subset (no external API at runtime).
- D5 `/contact-us/` → `/about#contact`; `/book-auditorium/` → `/about`; `/saidelhi-backend/*` → `/admin`.
- D6 News tabs as spec (all/news/activities/centenary); stories/special/key reachable via "All" + legacy links.
- D7 Legacy district tags by keyword heuristic; untagged stays null (no badge).
- D8 Value pages without Hindi copy show EN + "Available in English only" (design note).

## User questions (non-blocking)
- Q1 Join: OK that Join has no phone form (spec 11), only number + copy + QR? Or also an opt-in phone form using `POST /whatsapp/optin`?
- Q2 Public WhatsApp number to display (`WA_DISPLAY_NUMBER`) — pending with Cloud API creds.
- Q3 Map tiles: public OSM OK, or prefer a keyed provider (MapTiler/Google)?
- Q4 Real centre addresses + coordinates (map pins) and real district list/intros (open item 4).
- Q5 Contact details for About `#contact` (phone/email/address)? Auditorium booking — still needed on new site?
- Q6 Founder section: approved text/photo.
- Q7 Native Hindi review of value/about/programme copy.
- Q8 Keep `llms.txt` on the new site?
- Q9 Any legacy content intentionally not migrated (needs "Older news on the previous site" note)?

## User decisions (23 Oct 2026, lead)
1. Join: BOTH — WhatsApp number + copy + QR as primary, plus a small optional "get updates on WhatsApp" phone opt-in form using existing `GET/POST /whatsapp/optin` (bot token, 202 neutral, district + seva types, locale).
2. Map: OpenStreetMap tiles + Leaflet (no key), attribution visible.
3. Placeholders: public WhatsApp number from env `WHATSAPP_PUBLIC_NUMBER` (+ keyword), placeholder districts/centre coords; swap when user supplies real data. Other open questions (contact details, auditorium, founder text, llms.txt, unmigrated news): use defaults in this plan, mark TODO(user).
