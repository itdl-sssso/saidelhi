# Image needs: assets required from the client

Audit date 24 Oct 2026 (read-only pass over `src/`, `public/`, `messages/`, mocks/seed, specs, design export). Priority: P0 launch-blocking, P1 should have at launch, P2 later/nice.
Formats: photos WebP or JPG (sRGB, EXIF/GPS stripped); logos SVG (plus 512px PNG fallback). Keep a 2x original; the site resizes via `next/image`.

## Current inventory (what exists today)
- `public/brand/sarva-dharma-emblem.jpg` 512x512 JPG (real emblem; JPG, white box, no transparency).
- `public/images/values/photo-{sathya,dharma,prema,ahimsa,shanti}.webp`: 640x546, 469x351, 398x502, 337x479, 465x330. Low-res photos of Bhagawan from the design export.
- `public/images/values/value-*.webp` five value emblems (illustrated, from design export).
- `public/images/lotus-bloom.webp` 800x800 (static hero bloom), `public/models/lotus.glb` (3D hero).
- `src/app/favicon.ico` (16/32) and `src/app/apple-icon.png` 180x180: emblem.
- Everything else (centre photos, event photos, article covers, partner logos, og images, PWA icons, PDF/QR/WhatsApp branding) is absent or empty.

## A. Site-wide / brand
| # | Page/route | Slot | Should depict | Size/format | Current state | file:line | Pri |
|---|---|---|---|---|---|---|---|
| 1 | All public + portal + form links | Sarva Dharma emblem (nav, footer, form chrome) | Official emblem, transparent background | SVG (vector master) + 512x512 PNG | 512px JPG with white box, reused at 36-56px | `src/features/shell/links.ts:4`; `src/ui/NavBar/NavBar.tsx:110`; `src/features/shell/SiteFooter.tsx:29`; `src/features/formlink/ui/Chrome.tsx:18` | P0 |
| 2 | Site-wide (social share) | Default Open Graph / Twitter card image | Emblem + "Sri Sathya Sai Seva Organisation, Delhi NCR" on brand background | 1200x630 JPG/PNG, ≤300 KB (EN; HI variant optional) | None. Root `generateMetadata` sets no `openGraph.images`; event page OG has no image | `src/app/[locale]/layout.tsx:14`; `src/app/[locale]/(public)/events/[id]/page.tsx:25` | P0 |
| 3 | Site-wide | Favicon set | Emblem simplified for 16/32px | `favicon.ico` + `icon.svg` + 192/512 PNG | `favicon.ico` and `apple-icon.png` exist (emblem, 180px); no SVG icon, no 192/512 | `src/app/favicon.ico`; `src/app/apple-icon.png` | P1 |
| 4 | Site-wide | PWA / web manifest icons (maskable) | Emblem on solid brand colour, safe zone | 192x192 + 512x512 PNG, plus maskable 512 | No `manifest` file or route at all (form links use a service worker `public/f-sw.js`, so field volunteers may "Add to Home Screen") | `public/f-sw.js`; no `manifest.ts` | P1 |
| 5 | Footer / About | Emblem for dark backgrounds (mono/white version) | One-colour white emblem | SVG | Not present | n/a | P2 |

## B. Home `/`
| # | Page/route | Slot | Should depict | Size/format | Current state | file:line | Pri |
|---|---|---|---|---|---|---|---|
| 6 | `/` Thought for the Day | Portrait beside QuoteCard | Bhagawan Sri Sathya Sai Baba, high-quality, rights-cleared | 1200x1000 (6:5) WebP/JPG, ≤200 KB | Reuses low-res `photo-sathya.webp` 640x546 (upscaled) | `src/features/home/HomeSections.tsx:84` | P0 |
| 7 | `/` lotus hero journey | Five value photos floating in the lotus heart | One portrait per value (Sathya, Dharma, Shanti, Prema, Ahimsa) | 800x1000 (4:5) WebP, ≤150 KB each | Same five low-res design photos (337-640px wide) | `src/features/home/LotusJourney.tsx:21`; `src/features/home/values.ts:17`; `src/features/home/JourneyStage.tsx:228` | P0 |
| 8 | `/` Hero | Static fallback bloom (reduced motion, no WebGL) | Light lotus bloom | 1600x1600 WebP | `lotus-bloom.webp` 800x800 (soft at 2x) | `src/features/home/LotusJourney.module.css:278,304` | P2 |
| 9 | `/` Hero | 3D lotus model | Final lotus model (if design wants updates) | GLB, ≤2 MB | `lotus.glb` in place (design export) | `public/models/lotus.glb` | P2 |
| 10 | `/` Hero (no-JS) | Night poster | Photographic or illustrated night sky poster (optional) | 1920x1080 WebP | CSS radial-gradient stars, deliberate (no image request) | `src/features/home/LotusJourney.module.css:28` | P2 |
| 11 | `/` Centenary block | "100" artwork | Centenary mark/logo for Swami's 100th birth anniversary (Nov 2026) | SVG | Reuses `value-prema.webp` emblem behind a "100" numeral | `src/features/home/HomeSections.tsx:344` | P1 |
| 12 | `/` News strip | Cover for each article card | Event/seva photo (no identifiable beneficiaries) | 1600x1000 (16:10) WebP/JPG, ≤200 KB | Newspaper icon tile when `cover` is null; seeded articles have `featuredImage: ""` | `src/features/home/HomeSections.tsx:308`; `src/server/mock/fixtures/content.ts:47`; `scripts/seed.ts:148` | P1 |
| 13 | `/` Centre finder | Schematic grid (no photo) | None needed | n/a | SVG grid, fine | `src/features/home/CentreFinder.tsx:82` | none |

## C. Values `/values/[value]` (x5)
| # | Page/route | Slot | Should depict | Size/format | Current state | file:line | Pri |
|---|---|---|---|---|---|---|---|
| 14 | `/values/sathya` ... `/values/ahimsa` | Hero portrait (4:3 mobile, 4:5 desktop), one per value | Bhagawan portrait matched to the value (Truth, Righteousness, Peace, Love, Non-violence) | 1200x1500 (4:5) WebP, ≤200 KB each | Five low-res design photos; the `alt` is the same generic caption on all five | `src/features/values/ValueView.tsx:88`; `messages/en.json:3222` | P0 |
| 15 | Values pages, home rail | Value emblems (Sathya/Dharma/Shanti/Prema/Ahimsa) | Illustrated emblem per value | SVG preferred, else 512x512 WebP | WebP from design export, used at 52-88px | `src/features/home/values.ts:16`; `src/features/values/ValueView.tsx:72,246` | P2 |
| 16 | Values pages | Per-value alt text (distinct) | Text, not asset: describe each actual photo once chosen | n/a | One shared `portraitAlt` for all five | `messages/en.json:3222` | P1 |

## D. About `/about`
| # | Page/route | Slot | Should depict | Size/format | Current state | file:line | Pri |
|---|---|---|---|---|---|---|---|
| 17 | `/about` | Founder portrait (4:3 mobile, 4:5 desktop) | Bhagawan Sri Sathya Sai Baba, formal, client-approved | 1200x1500 (4:5) WebP/JPG, ≤200 KB | Reuses `photo-sathya.webp` (same as home); CLAUDE.md lists "founder text+photo" as TODO(user) | `src/features/about/AboutView.tsx:43`; `messages/en.json:3394`; `CLAUDE.md` M5 TODO(user) | P0 |
| 18 | `/about` | Wings / service wings illustrations (if client wants) | Seva wing icons (Education, Medical, Seva...) | SVG | Icon-font stand-ins only | `src/features/about/AboutView.tsx` (wings section) | P2 |
| 19 | `/about` | Auditorium / office photo | State office building exterior and auditorium (booking info is also TODO(user)) | 1600x1000 WebP | No slot exists | `src/features/about/AboutView.tsx:158` | P2 |

## E. Programmes `/programs`, `/programs/[type]`
| # | Page/route | Slot | Should depict | Size/format | Current state | file:line | Pri |
|---|---|---|---|---|---|---|---|
| 20 | `/programs/[type]` (each seva type: eye, blood, medical, food, education, etc.) | Hero image slot (spec: "no identifiable patients") | Representative seva activity per programme | 1200x1200 (1:1) WebP, ≤200 KB | Square card with a Lucide icon (`heroArt`, hidden below 900px) | `src/features/programs/ProgramView.tsx:70`; `src/features/programs/Programs.module.css:32`; `docs/specs/06-program.md:9` | P1 |
| 21 | `/programs` index | Card image per programme | Same as #20, cropped 16:10 | 800x500 WebP | Icons only, no image slot | `src/features/programs/ProgramsView.tsx` | P2 |
| 22 | `/programs/[type]` Partners panel | Partner logos (spec: "logos as text until supplied") | ICARE Eye Hospital, blood banks, etc., permission to use logo | SVG or 400x200 PNG, transparent | Name text + handshake icon; partner model has no `logoUrl` field | `src/features/programs/ProgramView.tsx:190-200`; `docs/specs/06-program.md:14`; `src/server/mock/fixtures/org.ts:106` | P2 |

## F. News `/news`, `/news/[slug]`
| # | Page/route | Slot | Should depict | Size/format | Current state | file:line | Pri |
|---|---|---|---|---|---|---|---|
| 23 | `/news` grid | Card cover per article | Event/seva photo | 1600x1000 WebP/JPG | Newspaper icon tile fallback when no cover | `src/features/public/p1.tsx:62-76` | P1 |
| 24 | `/news/[slug]` | Cover (and in-body photos) | Same; legacy posts reference `https://saidelhi.org/media/...`, rewritten to `MEDIA_ROOT` | 1600x1000 | Depends on legacy media copied onto the server; "Missing images" (`broken_images`) flagged by migration tool; dev `MEDIA_ROOT` is local only | `src/features/news/ArticleView.tsx:68`; `src/server/domain/articles.ts:37,124`; `src/server/services/portal/migration.ts:118`; `messages/en.json:2475` | P0 |
| 25 | `/news/[slug]` | OG image per article | Cover image (exists) | 1200x630 | Uses cover URL only when present; no fallback to default OG (see #2) | `src/app/[locale]/(public)/news/[slug]/page.tsx:24` | P1 |

## G. Events, Centres, Districts, Map, Impact, Join, Discourses, Privacy
| # | Page/route | Slot | Should depict | Size/format | Current state | file:line | Pri |
|---|---|---|---|---|---|---|---|
| 26 | `/events/[id]` | Results photos gallery (spec item 4: no identifiable beneficiaries) | Camp photos from approved reports | 1200x900 WebP | Empty (`resultsPhotos: []` in seed), section hidden when none | `src/features/event/EventView.tsx:334-340`; `src/server/mock/fixtures/events.ts:73` | P1 |
| 27 | `/events/[id]` | Event hero / OG image | Per-event or default banner | 1200x630 | No image at all; OG has title and description only | `src/app/[locale]/(public)/events/[id]/page.tsx:25` | P1 |
| 28 | `/centres/[slug]` | Centre photo gallery (building, activities) | Exterior + activity photos per centre (Mayur Vihar and others) | 1600x1200 (4:3) WebP, ≤250 KB, up to 12 | `photos: []` for every seeded centre; section hidden; uploaded via admin (8 MB cap) | `src/features/centre/CentreView.tsx:97-103`; `src/server/mock/fixtures/org.ts:135`; `src/contract/portal-admin.ts:361` | P0 |
| 29 | `/districts/[slug]` | Hero image (optional) | District landmark or samithi activity | 1600x700 WebP | No slot, text-only hero; districts are also placeholders (CLAUDE.md TODO) | `src/features/district/DistrictView.tsx:25` | P2 |
| 30 | `/impact` | District schematic map | None (SVG diagram) | n/a | Schematic tile map of nine placeholder districts, not a photo | `src/features/impact/DistrictMap.tsx:12` | P2 |
| 31 | `/join` | WhatsApp QR code | QR for official WhatsApp number | generated, no asset | Generated data URL; real `WHATSAPP_PUBLIC_NUMBER` still TODO(user) so QR points to a placeholder | `src/features/join/WhatsAppCard.tsx:76`; `CLAUDE.md` | P0 |
| 32 | `/join` | Hero photo of volunteers (spec: "Offer your hands") | Volunteers at seva, with consent | 1600x900 WebP | Text-only hero | `src/features/join/JoinView.tsx:40`; `docs/specs/11-join.md:8` | P2 |
| 33 | `/discourses`, `/discourses/[slug]` | Quote-card brand image (canvas) | Emblem on brand background, Hindi + English fonts | emblem SVG | Canvas draws text only; no emblem/logo in card | `src/features/discourses/quote-image.ts` (via `ShareQuote.tsx:8`) | P2 |
| 34 | `/map` | Centre markers/tiles | None | n/a | OSM tiles + default markers | `src/features/map/CentreMap.tsx:35` | none |

## H. Portal (`/admin`) and form links (`/f/<token>`)
| # | Page/route | Slot | Should depict | Size/format | Current state | file:line | Pri |
|---|---|---|---|---|---|---|---|
| 35 | `/admin/login`, `/f/*` | Branded header (emblem) | Emblem (see #1) | SVG | Uses same 512px JPG at 36px | `src/features/formlink/ui/Chrome.tsx:18` | P0 (via #1) |
| 36 | `/admin/reports` PDF (monthly + event report) | Letterhead logo/emblem | Emblem + organisation name header | PNG 600x600 transparent (pdf-lib `embedPng`) | No logo on PDF; text only, ASCII only (Hindi shows `?`) | `src/server/services/portal/reports.ts:184-194` | P1 |
| 37 | `/admin/links` QR poster | Poster header emblem / branding | Emblem + printable poster frame | SVG/PNG 600x600 | QR generated; no logo | `src/server/services/portal/qr-poster.ts` | P1 |
| 38 | `/admin/centres/[id]` | Centre photo upload (feeds #28) | n/a (upload UI) | JPG/PNG/WebP ≤8 MB | Works; EXIF/GPS not stripped (known open issue) | `src/features/admin/centres/CentreEditor.tsx:161,186`; `src/contract/portal-admin.ts:51` | P1 (process) |
| 39 | `/admin/partners` | Partner logo field | Logo per partner | SVG/PNG | Field absent | `src/contract/portal-admin.ts:388` | P2 |
| 40 | `/admin/people`, comments, inbox | User avatars | None in design; initials only | n/a | No avatar images | n/a | none |
| 41 | `/admin/inbox` | Sample scanned register photo (seed only) | Fake paper register, no real data | 1200x1600 JPG | `inbox/seed-register.png` referenced but file is dev-only | `src/server/mock/fixtures/wa.ts:193-197` | P2 |
| 42 | WhatsApp bot / templates | Template header image (Meta approval) | Emblem on brand background | 800x418 JPG/PNG (Meta header image: 1.91:1, ≤5 MB) | No header images configured; templates are text-only; creds pending | `docs/whatsapp-setup.md`; `src/server/whatsapp/bot/copy.ts` | P2 |
| 43 | WhatsApp Business profile | Profile photo | Emblem, square | 640x640 PNG/JPG | Not in repo (set in Meta console) | `docs/whatsapp-setup.md` | P1 |
| 44 | Email / OTP messages | Email logo | n/a, OTP goes by WhatsApp only | n/a | No email templates exist | n/a | none |

## Summary
- P0: 8 slots (#1, #2, #6, #7, #14, #17, #24, #28) plus #31 (QR number, config not an asset) and #35 (covered by #1). Distinct client deliveries: emblem SVG, OG image, hi-res Bhagawan photos (about 7: home thought, 5 values, founder), centre photo sets, real legacy media.
- P1: 12 slots (#3, #4, #11, #12, #16, #20, #23, #25, #26, #27, #36, #37, #38, #43).
- P2: 14 slots (#5, #8, #9, #10, #15, #18, #19, #21, #22, #29, #30, #32, #33, #39, #41, #42).
- Not needed: #13, #34, #40, #44.

## Rights and consent
- Photos of Bhagawan (home, values, about): confirm the copyright holder (Sri Sathya Sai Trust publications or photographers). Current files are low-res design-export images of unknown provenance; get written permission and a credit line, or supply licensed originals.
- Partner logos (ICARE etc.) and the Sarva Dharma emblem: need written permission from each owner; emblem master from the Organisation.
- Photos of people: obtain consent from every identifiable adult. Never publish children's faces without a parent's or guardian's written consent. Patients and beneficiaries must not be identifiable (spec rule for events/programmes). Prefer hands, venue and group-from-behind shots.
- Strip EXIF/GPS from all uploads before publishing (not done automatically for centre photos yet).
- Legacy saidelhi.org media: audit for people photos and personal data before migration (the migration tool flags risky types).
- Every image needs EN and HI alt text from the editor; alt text for the five value portraits is currently generic.
