# Dev contract — SSSSO Delhi NCR platform

Status: **v0.7 — M6 draft** · 23 Oct 2026 (amendments v0.2–v0.7 in §10)
Scope source: `docs/specs/` (50 page specs, v1 19 Oct 2026) · Design: SSSSO Delhi NCR Design System (`design-system/`) · Visual pages: Claude Design export (pending, `docs/design/`).

This file is the single agreement between the **backend track** and the **frontend track**. Neither track changes a shape in §4–§6 without updating this file in the same commit.

---

## 1. Architecture

| Concern | Decision |
|---|---|
| App | One Next.js 16 app (App Router, TS strict, `src/`). No separate backend service. |
| API | REST JSON under `/api/v1/*` via Route Handlers. Used by portal client components, the `/f/` form app (offline queue), the WhatsApp webhook, and any future mobile client. |
| Server reads | Server Components call the **service layer** (`src/server/services/*`) directly — no HTTP hop — and receive the **same DTOs** defined in `src/contract/`. |
| Contract code | `src/contract/` = zod schemas + inferred TS types + endpoint map. Imported by both tracks. Backend validates input/output with it; frontend types against it. |
| DB | **MySQL 8**, existing Django DB `saidelhi` (posts, gallery, slider, team members, auth). **Drizzle ORM**: `drizzle-kit pull` introspects the existing tables into `src/server/db/legacy.ts`; all new tables live in `src/server/db/schema/*.ts` with Drizzle migrations (`drizzle/`). Django tables are never altered by migrations; extra data for them goes in side tables (e.g. `article_i18n`). |
| Local DB | `docker compose` MySQL 8.0, port 3307, seeded by `pnpm db:seed` (fixtures + legacy import from a dump). Prod credentials only via env on the server. |
| Data source switch | `DATA_SOURCE=mock|db`. Every service has a mock implementation backed by `src/server/mock/fixtures/*`. Frontend track builds against `mock` until the backend milestone lands; then flips to `db`. |
| Auth | WhatsApp OTP (email OTP fallback for accounts with email). DB-backed sessions, `httpOnly` `Secure` `SameSite=Lax` cookie `sid`, 7-day sliding. No passwords anywhere. |
| Authorization | Role + scope (org unit). Enforced in services (never only in UI). See §3. |
| i18n | `next-intl`. English at `/…`, Hindi at `/hi/…` (portal and `/f/` too). UI strings in `messages/{en,hi}.json`. Content fields are bilingual objects (§4.1). |
| WhatsApp | Provider interface `WhatsAppProvider`; adapters `console` (dev) and `cloud` (Meta WhatsApp Cloud API). Webhook `POST /api/v1/whatsapp/webhook`. Switch: `WHATSAPP_PROVIDER`. |
| AI extraction | Provider interface `Extractor`; adapters `rules`, `ollama` (local Ollama) and `hf` (Hugging Face ONNX model run in-process by transformers.js, default LFM2.5-350M q4). Switch: `EXTRACTOR_PROVIDER`, `OLLAMA_URL`, `OLLAMA_MODEL`, `HF_MODEL`, `HF_DTYPE`, `HF_CACHE_DIR`. AI never writes final data — only inbox drafts. |
| Files | Local disk under `MEDIA_ROOT` (default `./media`, legacy Django media mounted read-only). Private files (register scans) in `MEDIA_PRIVATE_ROOT`, served only via authorised route. |
| Maps | Leaflet + OpenStreetMap tiles (no API key). District choropleth = static SVG/GeoJSON in repo. |
| Charts | Small in-house SVG components (bar, line, sparkline, funnel) using design tokens. |
| Offline (`/f/`) | Service worker + IndexedDB draft store + send queue. |
| Jobs | `src/server/jobs/*` invoked by `POST /api/v1/cron/[job]` with `CRON_SECRET` (server crontab). Jobs: reminders, escalations, KPI refresh, retention purge, monthly report. |
| Feature flags | Row in `setting` table: `discourses`, `offline_mode`, `ai_extraction`. Read via `flags()` service. |
| Testing | Vitest (contract + services), Playwright (critical flows), `pnpm typecheck`, `pnpm lint`. |

### Directory layout
```
src/
  app/
    (public)/[[...]]          public site (RSC)
    hi/…                       (handled by next-intl middleware; same route tree)
    f/[token]/…                form-link app (minimal layout)
    admin/…                    portal (shell layout)
    api/v1/…                   route handlers
  contract/                    zod schemas, types, endpoint map, error codes  ← shared
  server/
    db/ (client, legacy.ts, schema/*)  services/  mock/  providers/  jobs/  auth/
  ui/                          design-system components (ported to TSX)
  features/                    page-level composites per area
messages/en.json, messages/hi.json
design-system/tokens/*.css
drizzle/                       migrations
```

---

## 2. API conventions

**Base** `/api/v1`. JSON only (except file upload: `multipart/form-data`; exports: `text/csv`, `application/pdf`).

**Success** `200/201` →
```json
{ "data": <DTO or DTO[]>, "meta": { "page": 1, "pageSize": 25, "total": 132 } }
```
`meta` only on list endpoints. `204` for deletes/revokes with no body.

**Error** `4xx/5xx` →
```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Human readable, already localised", "fields": { "units": "Must be ≤ accepted donors" }, "retryAfter": 30 } }
```

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed JSON / params |
| 401 | `UNAUTHENTICATED` | No/expired session |
| 403 | `FORBIDDEN` | Role or scope does not allow |
| 404 | `NOT_FOUND` | Missing or not visible (never reveals existence across scopes) |
| 409 | `CONFLICT` | Stale `version` or illegal state transition |
| 410 | `LINK_EXPIRED` / `LINK_REVOKED` / `LINK_USED_UP` | Form-link states (spec 22) |
| 422 | `VALIDATION_FAILED` | `fields` map, messages in request locale |
| 423 | `LOCKED` | OTP lock (10 min), `retryAfter` seconds |
| 429 | `RATE_LIMITED` | `retryAfter` seconds |
| 503 | `PROVIDER_UNAVAILABLE` | WhatsApp/LLM down — UI offers fallback |
| 500 | `INTERNAL` | Logged with request id |

**Headers**: request locale via `Accept-Language` (`en`|`hi`) or `?locale=`; every response has `x-request-id`. Mutations require `x-csrf` header matching the `csrf` cookie (double-submit) for cookie-authenticated calls.

**Lists**: `?page=1&pageSize=25` (max 100), `?sort=field` / `-field`, filters as plain query params. Calendar/public feeds may use `?from=YYYY-MM-DD&to=…`.

**Concurrency**: editable entities carry `version: number`; PATCH must send it; mismatch → 409.

**Idempotency**: submission & upload POSTs accept `Idempotency-Key` header (UUID from client draft) — retries from the offline queue never double-submit.

---

## 3. Roles & scope

| Role code | Scope | Notes |
|---|---|---|
| `state_admin` | `ncr` | everything |
| `district_coord` | one district | approvals for district; manage samithi coords |
| `samithi_coord` | one samithi | plan/report own events |
| `content_editor` | `ncr` | content, impact controls |
| `translator` | — | discourses workspace only |
| `pii_officer` | `ncr` | follow-up, privacy, audit (read) |

`Session.me` returns `{ user, role, scope, permissions: Permission[] }`. Frontend **hides** (not disables) nav and actions lacking a permission. Backend re-checks every call.

---

## 4. Shared types (`src/contract/`)

### 4.1 Primitives
```ts
type Locale = 'en' | 'hi';
type I18nText = { en: string; hi: string | null };   // hi null → UI shows en + "available in English only" where spec says
type ISODate = string;      // 'YYYY-MM-DD' (IST calendar date)
type ISODateTime = string;  // RFC 3339 with offset, stored UTC, rendered Asia/Kolkata
type Id = string;           // ULID for new tables; legacy numeric ids stringified
type MaskedPhone = string;  // '+91 98•••••52' — raw phones never leave the server except Follow-up reveal
type PublicCount = number | { lt5: true };            // public small-number suppression (<5)
type Figure = { value: PublicCount | null; estimate: boolean };  // null = not reported → UI shows "—", never 0
```

### 4.2 Enums
```ts
EventStatus = 'draft'|'awaiting_approval'|'planned'|'awaiting_report'|'report_submitted'|'approved'|'cancelled'|'postponed'|'escalated'
SevaType    = 'eye'|'blood'|'medical'|'narayan_seva'|'bal_vikas'|'bhajan'|'study_circle'|'disaster_relief'|'cleanliness'|'other'   // extensible via settings
Wing        = 'service'|'educational'|'spiritual'|'mahila'|'youth'
LinkPurpose = 'report'|'desk'|'public'
LinkState   = 'active'|'expired'|'revoked'|'used_up'
Source      = 'form'|'upload'|'whatsapp'|'scan'|'portal'
Confidence  = 'high'|'check'|'low'
ArticleCategory = 'news'|'activities'|'centenary_national'|'centenary_state'|'key_programs'|'special_programs'|'stories'   // maps legacy N,A,C,D,K,S,P
```
Status pill rendering is fixed by spec README (label + colour family); the frontend owns a single `StatusPill` mapping.

### 4.3 Core DTOs (abridged — full zod in code)
```ts
OrgUnit   { id, code, kind:'ncr'|'district'|'samithi', name:I18nText, slug, parentId|null, active:boolean }
Centre    { id, slug, samithiId, districtId, name:I18nText, address:I18nText, geo:{lat,lng}|null, contactPhone:string|null /*centre number, public*/, schedule:Gathering[], photos:Media[] }
Gathering { day:0-6, time:'HH:mm', kind:'bhajan'|'study_circle'|'bal_vikas', language:Locale|'mixed' }
Partner   { id, name, kind:'hospital'|'blood_bank'|'ngo'|'school', city }
EventPublic {
  id, title:I18nText, sevaType, status /* planned|awaiting_report|report_submitted|approved|cancelled|postponed only */,
  startsAt:ISODateTime, endsAt:ISODateTime|null, postponedTo:ISODateTime|null,
  venue:{ name:string, address:string, geo|null }, samithi:{id,slug,name}, district:{id,slug,name},
  description:I18nText, volunteersNeeded:number|null, volunteersJoined:number, bring:I18nText[],
  partner:{name}|null, centreContact:string|null, publicLinkUrl:string|null,
  results: EventResults|null   /* non-null only when status=approved */, articleSlug:string|null, recurring:boolean
}
EventResults { tiles:{ key:string, label:I18nText, figure:Figure }[], breakdowns:{ key, label:I18nText, bars:{label:string, figure:Figure}[] }[], followUp:{ label:I18nText, done:number|null, of:number }|null, photos:Media[] }
EventAdmin = EventPublic & { status:EventStatus, source:Source, createdBy, timeline:TimelineStep[], links:FormLink[], submissions:SubmissionSummary[], attachments:PrivateAttachment[], followUpCount:number|null, reportDueAt|null, version }
TimelineStep { status:EventStatus|'event_day', at:ISODateTime|null, by:{ role, label:string }|null, channel:'whatsapp'|'portal'|'system'|null }
FormLink  { id, purpose:LinkPurpose, label:string /* 'Desk 2 – Mayur Vihar' */, sentTo:MaskedPhone|'qr'|null, state:LinkState, expiresAt, uses:number, maxUses:number|null, otpRequired:boolean, lastOpenedAt|null, url:string /* only to authorised viewers; token itself never rendered */ }
FormDefinition { id, templateId, version:number, sevaType, title:I18nText, sections:FormSection[] }
FormSection { id, title:I18nText, fields:FormField[], personalData:boolean }
FormField { id, kind:'number'|'text'|'date'|'time'|'select'|'multiselect'|'yesno'|'repeater'|'file'|'heading'|'help', label:I18nText, help:I18nText|null, required, min|null, max|null, options?:{value,label:I18nText}[], showIf?:Rule, checks?:CrossRule[], warnAbove?:number, kpi:string|null, locked:boolean, personal:boolean, fields?:FormField[] /*repeater*/ }
Submission { id, eventId, linkId, definitionVersion, answers:Record<fieldId, unknown>, submittedAt, submittedBy:MaskedPhone, source, status:'submitted'|'approved'|'changes_requested' }
InboxItem { id, source, sender:MaskedPhone, receivedAt, matchedEvent:{id,title}|null, confidence, ageDays, raw:InboxRaw, draft:{ answers, fieldConfidence:Record<fieldId,{level:Confidence, why:I18nText|null}> }, state:'for_me'|'escalated'|'done' }
Article   { slug, category, title:I18nText, summary:I18nText, bodyHtml:I18nText /* sanitised */, cover:Media|null, gallery:Media[], publishedAt, district:{slug,name}|null, eventId|null, readingMinutes:number, legacyId:number|null }
Discourse { slug, n, title:I18nText, date:string, place, occasion, source:{coll, url, pdf}, themes:string[], why:I18nText, blocks:{id, type:'para'|'heading'|'poem'|'quote', en, hi}[], quotes:{en,hi}[] }
KpiTile   { key, label:I18nText, figure:Figure, period:{from,to,label:I18nText}, sparkline?:number[], deltaPct?:number|null, note?:I18nText }
Media     { url, width, height, alt:I18nText }
Paged<T>  { data:T[], meta:{page,pageSize,total} }
```

---

## 5. Endpoint catalogue

`P` = public, `L` = valid form-link session, `A` = portal session (+ permission). Public pages use services in RSC, but every public read also exists as an endpoint for client islands & future apps.

### 5.1 Public (`P`)
| Method & path | Returns | Spec |
|---|---|---|
| `GET /home` | `{ thought, upcoming:EventPublic[≤6], kpis:KpiTile[4]|null, articles:Article[3], centenary:Article[], wings }` | 01 |
| `GET /values/:slug` | `ValuePayload` (v0.6) | 02 |
| `GET /impact?period=this_year|last_year|all&district=` | `{ tiles, bySevaType, byDistrict, trend:{month,figure}[], recent:EventPublic[5], methodNote }` | 04 |
| `GET /programs?wing=` · `GET /programs/:type` | `ProgramCard[]` / `ProgramDetail` (v0.6) | 05–06 |
| `GET /articles?c=&page=` · `GET /articles/:slug` | `Paged<Article>` / `Article` + prev/next/related | 07–08 |
| `GET /events?from&to&district&sevaType&samithi&needsVolunteers&page` | `Paged<EventPublic>` (status ≥ planned) | 09 |
| `GET /events/:id` | `EventPublic` | 10 |
| `GET /join?district&sevaType&from&to` | `JoinPayload` (v0.6) | 11 |
| `GET /centres?q=&district=&pincode=` · `GET /centres/:slug` | centre list (with next gathering, distance if pincode) / detail | 12, 14 |
| `GET /districts` · `GET /districts/:slug` | `DistrictSummary[]` / `DistrictPayload` (v0.6) | 13 |
| `GET /discourses?theme&q` · `GET /discourses/:slug` | flag-gated (404 when off); shapes §10 v0.8 | 15–16 |
| `POST /privacy/requests` | `{ id }` · 201 · rate-limited, bot-checked | 17 |
| `GET /redirects?path=` | legacy saidelhi.org URL → new path | 18, 41 |

### 5.2 Form links (`/f/[token]`)
| Method & path | Auth | Notes |
|---|---|---|
| `GET /links/:token` | P | `{ state, purpose, event:EventCard|null, otpRequired, deskLabel }` — 410 variants per spec 22; unknown → 404 generic |
| `POST /links/:token/otp` `{ phone }` | P | 202 always (neutral); 403 `PHONE_NOT_LISTED` only for report links (spec 19 copy) ; 429/423 |
| `POST /links/:token/verify` `{ phone, code }` | P | sets `fsid` cookie (link session, few hours) |
| `POST /links/:token/public` `{ botToken }` | P | public links: bot check → `fsid` |
| `GET /links/:token/form` | L | `{ definition:FormDefinition, prefill, existing:Submission|null, editable:boolean }` |
| `POST /links/:token/submissions` | L | `Idempotency-Key`; 201 `Submission`; 422 field errors |
| `PATCH /links/:token/submissions/:id` | L | until approved; 409 after |
| `POST /links/:token/attachments` | L | multipart, private storage |

### 5.3 Auth
`POST /auth/otp {phone, channel:'whatsapp'|'email'}` → 202 (neutral) · `POST /auth/verify {phone, code}` → sets `sid`, returns `Me` · `POST /auth/logout` · `GET /auth/me` → `Me`.

### 5.4 Portal (`A`) — all scoped server-side
| Area | Endpoints | Spec |
|---|---|---|
| Overview | `GET /admin/overview?scope=` → `{ needsYou:NeedItem[], kpis:KpiTile[4], upcoming:EventRow[], bySevaType }` | 24 |
| Events | `GET /admin/events?status&from&to&sevaType&district&samithi&source&page` · `POST /admin/events` · `GET/PATCH /admin/events/:id` · `POST /admin/events/:id/{submit,approve-plan,approve-report,request-changes,cancel,postpone,reopen}` · `POST /admin/events/bulk/resend-links` | 25–27 |
| Links | `GET /admin/links?state&purpose&district&event` · `POST /admin/events/:id/links` · `POST /admin/links/:id/{resend,extend,revoke}` · `GET /admin/links/:id/qr.pdf` | 26, 32 |
| Inbox | `GET /admin/inbox?tab` · `GET /admin/inbox/:id` · `PATCH /admin/inbox/:id` (draft edits, event match) · `POST /admin/inbox/:id/{approve,escalate,reject,ask}` | 28 |
| Approvals | `GET /admin/approvals?tab` · `POST /admin/approvals/bulk {ids, action:'approve'}` (plans only) | 29 |
| Forms | `GET /admin/forms` · `GET/PATCH /admin/forms/:id` (draft) · `POST /admin/forms/:id/{publish,duplicate,test}` · `GET /admin/forms/:id/versions` · `GET /admin/forms/:id/template.xlsx` · `POST /admin/forms/:id/change-requests` | 30–31 |
| Uploads | `POST /admin/uploads` (multipart) → preview with row errors · `POST /admin/uploads/:id/confirm` · `GET /admin/uploads` · `GET /admin/uploads/:id/errors.xlsx` | 33 |
| Org | `GET /admin/org/tree` · `POST /admin/org` · `PATCH /admin/org/:id` · `POST /admin/org/:id/{merge,deactivate}` | 34 |
| Centres / Partners | CRUD `/admin/centres`, `/admin/partners` | 35–36 |
| People | `GET /admin/people` · `POST /admin/people/invite` · `PATCH /admin/people/:id` · `POST /admin/people/:id/deactivate` | 37 |
| Content | CRUD `/admin/content` (articles incl. legacy, thought-for-day, announcements, home sections) · `POST /admin/content/from-event/:eventId` | 38 |
| Discourses | `GET /admin/discourses` · `GET/PATCH /admin/discourses/:id` (paragraph-level) · `POST /admin/discourses/:id/{ai-draft,send-review,approve,publish}` | 39 |
| Impact controls | `GET/PATCH /admin/impact` · CRUD `/admin/impact/estimates` | 40 |
| Migration | `POST /admin/migration/runs` · `GET /admin/migration/runs/:id` · CRUD `/admin/redirects` | 41 |
| WhatsApp | `GET /admin/whatsapp/{templates,reminders,log,status}` · `PATCH /admin/whatsapp/reminders/:id` · `POST /admin/whatsapp/broadcasts` (`dryRun:true` returns cost estimate) | 42 |
| Volunteers | `GET /admin/volunteers?event=` | 43 |
| Reports | `GET /admin/reports` · `POST /admin/exports {scope,period,sevaTypes,fields,reason}` → CSV | 44 |
| Health | `GET /admin/health` | 45 |
| Follow-up | `GET /admin/follow-up` · `POST /admin/follow-up/:id/reveal-phone` (logged) · `PATCH /admin/follow-up/:id` | 46 |
| Privacy | `GET/PATCH /admin/privacy/requests` · `GET /admin/privacy/{consents,retention,breaches}` · `POST /admin/privacy/breaches` | 47 |
| Audit | `GET /admin/audit?…` (read-only) | 48 |
| Settings | `GET/PATCH /admin/settings/{seva-types,kpis,strings,flags,links,escalation}` | 49 |

### 5.5 WhatsApp & jobs
`GET/POST /whatsapp/webhook` (Meta verify + signed messages, `X-Hub-Signature-256` checked) · `POST /cron/:job` (`Authorization: Bearer CRON_SECRET`).

---

## 6. How the frontend reacts

| Situation | Frontend behaviour |
|---|---|
| Loading (RSC) | `loading.tsx` skeletons shaped like the final layout (KPI tiles, cards, tables). Never spinners on full pages. |
| Loading (client mutation) | Button shows pending state, disabled; no optimistic update for approvals, submissions, revokes. Optimistic only for toggles (flags, reminders). |
| Empty | Spec copy per page (e.g. "No seva is planned this week…"). Component `EmptyState`. |
| `Figure.value === null` | Render "—" with tooltip "Not reported yet". Never 0. |
| `{ lt5: true }` | Render "fewer than 5". |
| `estimate: true` | "Estimate" badge + tooltip text from settings; hatched fill in charts. |
| `I18nText.hi === null` in Hindi | Show English + notice "This … is available in English only" (articles), or silent fallback for short labels. |
| 401 | Portal: redirect `/admin/login?next=…`. `/f/`: back to verify step **keeping the IndexedDB draft**. |
| 403 | Hide the control; if a page: "You don't have access to this" with link to Overview. |
| 404 | `notFound()` → spec 18 page. |
| 409 | Toast "This changed while you were editing" + reload button; keep local edits visible. |
| 410 (links) | Spec 22 variant page. |
| 422 | Map `fields` onto inputs inline (both languages from server); focus first error; form summary at top. Warnings (non-blocking) come from client-side rules in the definition and render yellow. |
| 423 / 429 | Disable action, countdown from `retryAfter`. |
| 503 `PROVIDER_UNAVAILABLE` | Login: offer email OTP; links: show "Code not arriving?" help; bot actions: queue and show "Will send when WhatsApp is back". |
| 5xx / network | Toast + retry; `/f/` form goes to offline queue ("Saved on this phone · Not sent yet"). |
| Masked data | UI never unmasks except Follow-up "Reveal" which calls the logged endpoint. |
| Status pill | Single `StatusPill` from §4.2 enum, label + colour family per spec README; `cancelled` also strikes the date. |
| Revalidation | Public RSC use `revalidateTag` (`events`, `impact`, `articles`, `centres`, `home`); portal mutations call it via services. Impact numbers: nightly + on approval. |

---

## 7. Data model (new tables, MySQL, Drizzle)

Legacy (introspected, read + write via Drizzle, schema untouched): `postcontent_postcontent`, `postcontent_contentpostimage`, `postcontent_sliderimages`, `districtmembers_teammembers`, `auth_user` (+ Django internals left alone).

New: `org_unit`, `org_closure`, `centre`, `centre_gathering`, `partner`, `app_user`, `role_assignment`, `session`, `otp_challenge`, `event`, `event_timeline`, `form_template`, `form_version`, `form_link`, `link_session`, `submission`, `submission_answer_kpi` (flattened KPI facts), `attachment`, `inbox_item`, `upload_batch`, `upload_row_error`, `article_i18n` (Hindi + district/event/status for legacy posts), `content_item` (thought-for-day, announcements, home sections), `discourse`, `discourse_block`, `impact_estimate`, `kpi_definition`, `seva_type`, `setting`, `whatsapp_template`, `whatsapp_message`, `whatsapp_conversation`, `reminder_rule`, `volunteer_signup`, `followup_person` (restricted), `consent_record`, `privacy_request`, `breach`, `export_log`, `audit_log` (append-only), `redirect`, `migration_run`.
KPI views: SQL views `v_kpi_*` over approved submissions + estimates.

---

## 8. Milestones (each = one commit on `main`, both tracks merged & verified)

| # | Milestone | Backend track | Frontend track |
|---|---|---|---|
| M0 | Foundation | Docker MySQL, legacy dump import, `drizzle-kit pull`, base schema, `src/contract` v1, mock fixtures, service interfaces, error/envelope helpers | Port 19 DS components to TSX + Tailwind tokens, Devanagari fonts, i18n (next-intl), public shell (NavBar/footer), `StatusPill`, `EmptyState`, KPI tile, charts |
| M1 | Public core (P0) | services+APIs: home, events, centres, impact, privacy requests | Home, Calendar, Event, Centre, Impact, Privacy, 404/500 |
| M2 | Form links (P0) | link tokens, OTP (console provider), link sessions, form definitions (eye + blood hand-written), submissions, attachments | `/f/` verify/fill/done/invalid, offline drafts + queue |
| M3 | Portal pilot core (P0) | auth, RBAC, overview, events lifecycle, approvals, links admin, org, people, audit writes, escalation job | Login, admin shell, Overview, Events, Event detail, Plan event, Approvals, Form links, Org, People |
| M4 | WhatsApp + inbox (P0) | Cloud API adapter, webhook, bot flows, reminders, Ollama extractor, inbox | Review inbox list/item, WhatsApp admin |
| M5 | Public P1 + migration | articles (legacy), values, programs, districts, join, centres map, redirects, legacy import | Values×5, About, Programs, Program, News, Article, Join, Map, District |
| M6 | Portal P1 | form builder/versions, uploads (xlsx), centres, partners, content, impact controls, volunteers, reports/exports, health, follow-up, privacy, settings | corresponding admin screens |
| M7 | Discourses + hardening | import 87 translated discourses, flag | Discourses list/detail/workspace; a11y pass, perf, Playwright e2e |

Definition of done per milestone: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green; Playwright smoke for the milestone's flows on `DATA_SOURCE=db`; EN + HI render; 375px check; commit.

---

## 9. Open items (need answers, not blocking M0)
1. Claude Design page export → `docs/design/` (Home lotus journey, Values, Calendar, Map visuals).
2. A `mysqldump` of the server DB (schema + data, or schema-only + media) — or the DB analysis document mentioned — into `docs/db/`.
3. WhatsApp Cloud API credentials (see `docs/whatsapp-setup.md`).
4. ~~Real district / samithi list~~ done 24 Oct 2026: Central, East, North, South East, South West, West, Faridabad, Gurugram, Gautam Buddh Nagar, Ghaziabad (56 samithis; slugs `south-east`, `south-west`, `gautam-buddh-nagar`; old placeholder slugs `new-delhi`, `south`, `noida-ghaziabad` removed).
5. Sarva Dharma emblem file; photography.

---

## 10. Amendments log

### v0.2 (M0 backend)
1. `ArticleSummary` = `Article` minus `bodyHtml` and `gallery`. Used by `/articles` lists, `home.articles`, `home.centenary`, `related`. Detail endpoint returns `ArticleDetail` (Article + `prev`, `next`, `related`, linked `event`).
2. `Media.width` / `Media.height` are `number | null` (legacy images have unknown sizes).
3. `KpiTile.period` = `{ from: ISODate | null, to: ISODate, label: I18nText }`; `from` null = all time.
4. Payload DTOs added (zod in `src/contract`): `HomePayload`, `ImpactPayload`, `DistrictPayload`, `CentreListItem`, `CentreDetail`, `ArticleDetail`, `ArticleRef`, `Thought`, `WingCard`, `SevaTypeImpact`, `DistrictImpact`, `PeriodInfo`, `EventCard`, `LinkInfo`, `Health`, `FeatureFlags`, `Me`, `PrivacyRequestInput`.
5. Error code `PHONE_NOT_LISTED` (403) added to §2.
6. Invalid query/path params → 400 `BAD_REQUEST` with `fields`; invalid body → 422 `VALIDATION_FAILED`.
7. `/articles?c=` accepts `all`, any `ArticleCategory`, or `centenary` (both centenary categories).
8. `/centres` is paged, default `pageSize` 100; `distanceKm` null until pincode geodata exists.
9. `/events` without `from`/`to` lists from today (IST) onward.
10. `Permission` is `string` until M3 defines the set.
11. KPI facts table is `submission_answer_kpi`; KPI labels/rules live in `src/server/domain/kpi.ts` until `kpi_definition` (M6).

### v0.3 (M2 backend)
1. `LinkInfo` adds `expiresAt`, `botChallenge`, `hasSession`.
2. Error body may carry `details`; 410 link errors carry `{ link: LinkInfo }` (`LinkGoneDetails`). Event card only for expired/revoked.
3. `Submission` adds `version`; `answers` include personal answers only for the submitting link session.
4. `FormField` adds optional `prefill`, `readOnly`, `consent`, `format: "phone"`. KPI refs may carry a dimension (`"eye.spectacles_by_power:+1.0"`, `parseKpiRef`). Cross-rule operands may be sums (`"a+b+c"`).
5. New schemas: `LinkTokenParams`, `LinkSubmissionParams`, `OtpRequest`, `OtpSent`, `VerifyRequest`, `PublicSessionRequest`, `LinkSession`, `FormPayload` (+`purpose`, `event`), `SubmissionInput`, `SubmissionPatch`, `LinkAttachment`, `ATTACHMENT_LIMITS`, `linkEndpoints`, `formLinkPath`, `LINK_HEADERS`, `LINK_COOKIES`. Shared validation engine: `src/contract/form-rules.ts` (client reuses it for live checks).
6. Wrong OTP → 422 `fields.code` + tries left. Replayed submission → 201 with `idempotent-replayed: true`. Cookie mutations without valid `x-csrf` → 403.
7. Env: `APP_URL`; `SESSION_SECRET` required in production. Link tokens = HMAC(nonce, SESSION_SECRET); rotating the secret invalidates all links.
8. Desk links without OTP open a session via `POST /links/:token/public` (bot check). Used-up report/desk links still admit a verified session to edit its own report.
9. `GET /media/[...path]` serves `MEDIA_ROOT` (legacy Django media), excluded from the i18n proxy.

### Backlog from M1 frontend (to land with M3/M5 backend)
- `EventPublic.approvedAt: ISODateTime | null` (spec 10 "approved on").
- `EventPublic.centre: { slug } | null` (samithi → centre link; today relies on equal slugs).
- `GET /org/units?kind=district|samithi` (calendar filter options).
- Expand centre weekly gatherings into calendar occurrences (recurring, rendered lighter).
- Public not-found for unknown ids/slugs returns 200 after streaming starts; needs status fix.
- WhatsApp opt-in endpoint (Join / Calendar explainer) — M4.

### v0.4 (M3 backend)
1. CSRF header name is `x-csrf` (`PORTAL_HEADERS`, `LINK_HEADERS`).
2. `reopen` requires `events.reopen` (state admin only); district coord → 403.
3. `selfApproved` lives on `EventRow` only, not `EventAdmin`.
4. Dev seed users: +91 90000 00001…09 (one per role + extras), …00 deactivated. Re-seed clears sessions/audit.

### Backlog from M2 frontend
- `FormPayload.editable` must be false for public links when the event is not `planned`/`postponed` (today send fails 409).
- Seed label "Under 18 (optional)" duplicates the kit's optional marker — fix data.

### v0.5 (M4 — lead, before tracks)
Zod lives in `src/contract/whatsapp.ts` (+ `events.ts`, `endpoints.ts`, `auth.ts`). Summary:
1. `EventPublic.approvedAt: ISODateTime|null`, `EventPublic.centre: {slug}|null` (assembler fills `centre`; `approvedAt` TODO backend from timeline).
2. `GET /org/units?kind=district|samithi[&district=slug]` → `OrgUnit[]` (public, active only).
3. Calendar: centre weekly gatherings expand into `GET /events` rows with `recurring:true`, id `gath_<gatheringId>_<YYYYMMDD>`, status `planned`, `centre.slug` set; `GET /events/:id` for such ids → 404 (UI links recurring rows to the centre page).
4. Inbox: `GET /admin/inbox?tab` → `InboxRow[]` + `meta.counts`; `GET /admin/inbox/:id` → `InboxDetail` (thread, candidates, definition, history, `can`, version); `PATCH` `InboxPatchBody`; `POST …/approve|escalate|reject|ask` (bodies in zod; optimistic `version`, 409 `CONFLICT` on stale). Approve creates a submission and moves event → `report_submitted`. Reject/ask message the sender.
5. WhatsApp admin: templates, reminders (+PATCH enabled), broadcasts (`dryRun` estimate; opted-in only), log + thread, status. Permissions: `whatsapp.manage` (state admin, all tabs), new `whatsapp.reminders` (district coord: Reminders tab only).
6. `POST /whatsapp/optin` (`OptInBody`, bot-checked, 202 neutral). Consent recorded when user replies YES.
7. Dev simulator: `POST /dev/whatsapp/inbound` (`SimInboundBody` → `WaOutbound[]`), `GET /dev/whatsapp/messages?phone` → `SimMessage[]`, `POST /dev/whatsapp/reset`. 404 unless console provider and non-production. Page `/dev/whatsapp` (frontend, dev only).
8. AI extractor: `EXTRACTOR_PROVIDER=rules|ollama` (existing env name; default `rules`), `OLLAMA_URL`, `OLLAMA_MODEL=smollm2:1.7b` (360m on weak servers). Rules-first (numbers, dates, Hinglish keywords), SmolLM fills gaps; every extraction is a draft in the inbox — never counts until a person approves. Server cannot run big LLMs (user, 23 Oct).
9. Backlog fixes in M4: `FormPayload.editable=false` for public links when event not planned/postponed; seed label "Under 18 (optional)" → "Under 18"; HTTP 404 status for unknown public ids/slugs and unbuilt `/admin/*` routes.

### v0.5.1 (M4 backend additions, logged by lead)
1. `GET /whatsapp/optin` → `{botToken, minAgeMs}` (`OptInChallenge`); POST → 202 `{accepted:true}`. Opt-in state in new `whatsapp_optin` table (pending → opted_in on YES → stopped on STOP); `consent_record` stays submission-bound.
2. New zod: `OrgUnitsQuery`, `OptInChallenge`, `InboxIdParams`, `InboxMediaQuery`, `WaLogQuery`.
3. `CronJob` += `reminders` (day-before checklist + report reminders); `report-reminders` kept.
4. `GET /admin/inbox/:id/media?m=<msgId>` serves private inbox photos (audited); `ThreadMessage.media.url` points there. In WhatsApp log threads `media.url` is `""`.
5. `NewSubmissionWrite.linkId` nullable; `links.submitExternal` / `links.reportContext` for chat/inbox reports. Provider interface += `sendInteractive`.
6. Templates needing Meta approval added: `optin_confirm`, `plan_decision`, `review_message`.
7. Inbox RBAC: samithi coord view-only; district acts on first-review; state on escalated or any open.
8. Reminder rules are global (district toggle affects all).
9. `GET /events` gathering rows: 28-day horizon when `to` absent.
10. Env: `EXTRACTOR_PROVIDER=rules|ollama`, `OLLAMA_MODEL=smollm2:1.7b`, new `WA_DISPLAY_NUMBER`, `WA_COEXISTENCE`. Migrations `0003_m4_whatsapp`, `0004_m4_whatsapp_msg_index`.
10. M4 integration: HTTP 404 for unknown `/events/:id`, `/centres/:slug`, `/admin/events/:id[/edit]` (EN + `/hi`) is answered by `src/proxy.ts` (Node runtime): it probes existence (`services().events.exists(id, publicOnly)`, `centres.bySlug`; positive hits cached 60 s in-process) and rewrites unknown ones to the localised `[...rest]` catch-all (real 404). Reason: with Cache Components, `params` must sit under Suspense, so a page-level `notFound()` always streams as 200 (Next docs: guides/streaming "The HTTP contract"). New service method `EventsService.exists`. Frontend dev-fixture shim removed; simulator reset now sends `{ phone }`.

### v0.6 (M5 — lead, before tracks)
Zod: new `src/contract/public.ts` + `src/contract/redirects.ts`; edits in `content.ts`, `impact.ts`, `queries.ts`, `endpoints.ts`. Plan: `docs/progress/M5-plan.md`.
1. Editorial copy for Values, About, Programs/Program (descriptions, "what happens" steps, value prose, teachings) lives in `messages/{en,hi}.json` (frontend). APIs carry live data only. Content-admin editing of this copy is out of scope (spec 38 covers articles/home/thoughts only).
2. `GET /values/:slug` (`ValueParams`) → `ValuePayload { slug, prev, next, lived:{sevaType|null, wing|null}, facts:LabelledFigure[], upcoming:EventPublic[≤3], discourses:DiscourseSummary[≤3]|null }`. Mapping fixed in `VALUE_LINKS` (sathya→study circles/overview, dharma→bal_vikas, shanti→bhajan, prema→narayan_seva/service, ahimsa→cleanliness/overview). `discourses:null` when flag off. Order `VALUE_ORDER` cycles.
3. `GET /programs?wing=` (`ProgramsQuery`) → `ProgramCard[]` (`next:{eventId,startsAt,district}|null`, `thisYear:LabelledFigure|null`, `href`). `GET /programs/:type` (`ProgramParams`, unknown/inactive type → 404) → `ProgramDetail { …card, kpis:KpiTile[]|null, funnel:LabelledFigure[]|null, upcoming:EventPublic[≤6], articles:Article[≤3], partners:Partner[] }`. Funnel figures `value:null` → "—".
4. `GET /join` (`JoinQuery`: district, sevaType, from, to, page, pageSize=12) → `JoinPayload { events:Paged<EventPublic>, whatsapp:WhatsAppContact{number|null, waMeUrl|null, keyword} }` (single `data` object; paging inside `events.meta`). Events = public non-recurring planned|postponed with open volunteer slots. No personal-data form on Join (spec 11); `POST /whatsapp/optin` is not used there (see plan, user question Q1).
5. `GET /districts` → `DistrictSummary[] { district:UnitRef, samithiCount, centreCount }`. `DistrictPayload.demographics: DemographicSplit[]` (age|gender bars, `<5` suppressed; `[]` when none) — new required field.
6. `GET /centres` adds `pincode` (6 digits) → `distanceKm` + nearest-first; unknown pincode → nulls. Pincode centroids: static NCR table shipped by backend.
7. `DiscourseSummary` = `Discourse.pick(slug,n,title,date,place,themes)`.
8. Redirects: `legacyRedirect(path)` / `isLegacyPath(path)` pure rules from Django `urls.py` (about-us, contact-us, get-involved, wings/<name>, content/<Name>/getallposts, content/<slug>, book-auditorium, saidelhi-backend). `GET /redirects?path=` (`RedirectQuery`) → `RedirectTarget {to, permanent}` | 404. New `redirect` table (manual/migration rows) checked before rules. `src/proxy.ts` answers legacy paths with 301 (localised to unprefixed EN).
9. Public routes (unlocalised): `/values/[slug]`, `/about`, `/programs`, `/programs/[type]`, `/news`, `/news/[slug]`, `/join`, `/centres/map`, `/districts/[slug]`. Proxy 404 probes extend to `news/[slug]`, `districts/[slug]`, `programs/[type]`, `values/[slug]`; `centres/map` must be excluded from the centre probe.
10. Endpoint builders: `endpoints.districts()`, `centres({pincode})`, `join({…page})`.

### v0.6.1 (M5 integration)
1. Env: `WHATSAPP_PUBLIC_NUMBER` (preferred) > `WA_DISPLAY_NUMBER` > dev-only placeholder; `WHATSAPP_PUBLIC_KEYWORD` (default `JOIN`) feed `JoinPayload.whatsapp`. Absent in production → `number:null, waMeUrl:null`.
2. Migration `0005_m5_public.sql`: `redirect` table (`from_path` PK, `to_path`, `permanent`, `source` rule|manual|migration, `hits`). `RedirectsService.resolve` = table row first, then `legacyRedirect()`; `GET /redirects?path=`.
3. `src/app/sitemap.ts` + `src/app/robots.ts` (robots disallow `/admin`, `/f/`, `/api`, `/dev`).
4. `next.config.ts` `skipTrailingSlashRedirect: true`: legacy paths (`/about-us/`) 301 once via the proxy; any other trailing-slash path gets a single 308 to the slash-less URL from `src/proxy.ts`.
5. Unmatched legacy path rewrite (`/en/__not-found?moved=1`) now carries HTTP 404 (`NextResponse.rewrite(url, { status: 404 })`).
6. Proxy 404 probes cover `news/[slug]`, `districts/[slug]`, `programs/[type]`, `values/[slug]`; `centres/map` excluded from the centre probe.
7. Frontend TEMP fixtures removed; `features/public/data.ts` calls `services().values|programs|join|districts.list`.

### v0.7 (M6 — lead, before tracks)
Zod: new `src/contract/portal-admin.ts` (all M6 DTOs/bodies/queries) + `src/contract/form-builder.ts` (pure builder helpers); edits in `forms.ts`, `auth.ts`, `portal.ts`, `endpoints.ts`, `index.ts`. Plan: `docs/progress/M6-plan.md`. All additions backwards compatible (new optional field, new enum members, new schemas). Endpoint builders: `adminEndpoints.*` (v0.7 block). §5.4 rows for these areas are superseded by this list.
1. **Permissions** += `forms.read` (view templates, request changes) and `privacy.read` (read-only privacy tabs). RBAC (backend): district += `forms.read`, `partners.manage`; content_editor += `centres.manage`; state has all. Follow-up lead = `pii_officer` role (TODO(user)). Nav (frontend): Forms gated on `forms.read`; Privacy on `privacy.read` (alsoFor `privacy.manage`).
2. **`FormField.retentionDays?`** (1–3650, personal fields; default `DEFAULT_PERSONAL_RETENTION_DAYS` = 365). `form-builder.ts`: `CORE_FIELD_IDS` (samithi, date, venue, volunteers, volunteer_hours — "people served" is derived from `served` KPIs), `builderChecks(def,{purpose})` → `BuilderCheck[]` (structure, core_fields, kpi_unique, hi_labels, personal_consent, personal_retention [warn], no_id_numbers), `canPublish`, `missingHindi`, `fieldCount`, `excelColumns(def)` → `ExcelColumn[]` (header = field id, `samithi` → `samithi_code`; no personal/repeater/file fields), `ruleHolds`, `chatQuestions(def, answers)` (moved from `server/whatsapp/questions.ts`, which must re-export). Builder previews run client-side with these; backend uses the same for publish, xlsx and the bot.
3. **Forms (30–31)**: `GET /admin/forms` → `FormsPayload {templates: FormTemplateRow[], changeRequests, can}`; `POST /admin/forms` (`FormTemplateCreate`) → 201 `FormTemplateDetail`; `GET /admin/forms/:id` → `FormTemplateDetail {template, draft|null, published|null, versions, kpiOptions, version|null, can}`; `PATCH /admin/forms/:id` (`FormDraftPatch {definition, version|null}`; null creates "draft of v<n+1>"); `POST …/publish {version}` (422 `fields` by field id when a blocking check fails; new immutable version; live links keep theirs); `POST …/duplicate` (`FormDuplicateBody`); `POST …/test` (`FormTestBody` → `FormTestResult`, dry run); `GET …/versions`, `GET …/versions/:v` → `FormDefinition`; `GET …/template.xlsx?samithi&version`; `POST …/change-requests` (`ChangeRequestCreate`) → `FormChangeRequest`; `PATCH /admin/forms/change-requests/:id` (`ChangeRequestDecision`).
4. **Uploads (33)**: `GET /admin/uploads/options` → `UploadOptions`; `GET /admin/uploads/template.xlsx?sevaType&samithi`; `POST /admin/uploads` multipart (`file` + `UploadForm`; `UPLOAD_LIMITS`: ≤5 MB, .xlsx/.csv, ≤1000 rows) → 201 `UploadPreview` (issue rows first; same sha256 as a loaded batch → `status:no_changes` + `sameAs`); `POST /admin/uploads/:id/confirm {version}` → `UploadBatch` (`counts.new/updated/rejected`); `GET /admin/uploads?status&sevaType&page` → `Paged<UploadBatch>`; `GET /admin/uploads/:id` → `UploadPreview`; `GET …/errors.xlsx` (marked cells + EN/HI message column), `GET …/original`; `POST /admin/uploads/inbox` (multipart, "use your own file") → `{inboxItemId}`. Row identity = samithi + date + seva type → event (`source: upload`, `report_submitted`) + submission awaiting district approval; approved events never overwritten (row rejected `duplicate_row`). Issues carry `UploadRejectReason` + bilingual plain message.
5. **Centres (35)**: `GET /admin/centres?q&district&active&page` → `Paged<CentreAdminRow>`; `POST /admin/centres` (`CentreInput`) → 201 `CentreAdmin`; `GET/PATCH /admin/centres/:id` (`CentrePatch` + `version`); `POST /admin/centres/:id/photos` multipart (`file`, `alt`) → 201 `Media` (then PATCH `photos`). `contactPhone` equal to a portal user's phone → 422. Scope: samithi coord own centre, district its centres, state/content editor all.
6. **Partners (36)**: `GET /admin/partners?q&kind&city&active&page` → `Paged<PartnerAdmin>` (`nameHi`, internal `contact`, `showPublicly`, `active`, `eventsThisYear`, `version`); `POST` (`PartnerInput`), `PATCH /admin/partners/:id` (`PartnerPatch`). Public pages show a partner only when `showPublicly` (backend filters `EventPublic.partner`, `ProgramDetail.partners`).
7. **Content (38)**: `GET /admin/content?tab&status&lang=hi_missing&district&q&page` → `Paged<ContentRow>` + `meta.counts` (by `ContentTab`); `POST /admin/content` (`ContentCreate`, discriminated `kind: article|item`) → 201 `ContentDetail`; `GET/PATCH /admin/content/:id` (`ContentPatch`; publish/schedule/hide via `status` + `publishAt`); `DELETE /admin/content/:id` (drafts only) → 204; `POST /admin/content/from-event/:eventId` → 201 `ArticleEditor` (approved events only); `POST /admin/content/media` multipart → `Media`; `GET /admin/content/thoughts?from&to` → `ThoughtDay[]`; `POST /admin/content/thoughts/import` (CSV) → `ThoughtsImportResult`. New native `article` table; legacy posts list as `legacy-<postId>` (`version: 0`) and are copied-on-write into `article` (`legacy_id`) on first PATCH — Django tables never touched; public articles service prefers the native row. Results card = `<div data-event-results="<eventId>"></div>` in sanitised HTML; public article page renders approved results there. Scheduled items go live via cron `publish-scheduled` (reads also treat `publishAt ≤ now` as published).
8. **Impact controls (40)**: `GET /admin/impact` → `ImpactAdminPayload {kpis: ImpactKpiControl[], showEstimates, estimateTooltip, preview: KpiTile[], version}`; `PATCH /admin/impact` (`ImpactSettingsPatch`; ≤4 home tiles). Estimates: `GET /admin/impact/estimates?district&year&page` → `Paged<ImpactEstimateRow>`; `POST` (`ImpactEstimateInput`, year or month level, `source` required), `PATCH`/`DELETE /admin/impact/estimates/:id`. Public Impact/Home read `kpi_definition.public_impact/home_tile` + setting `impact {showEstimates, estimateTooltip}`.
9. **Migration (41)**: source = Django tables already loaded by `db:import-legacy` (`legacy_db`) or an uploaded old `sitemap.xml` (redirect harvesting). `POST /admin/migration/runs` → 201 `MigrationRun` (`mapping`, preview counts + issues); `GET /admin/migration/runs` (latest 20) and `/:id`; `PATCH /:id` (`MigrationMapPatch`); `POST /:id/import {version}` (idempotent) → `done`; `GET /:id/report.csv`. Redirects: `GET /admin/redirects?q&source&page` → `Paged<RedirectRow>`; `POST /admin/redirects` (`RedirectInput`, upsert); `DELETE /admin/redirects?from=` → 204. Rows live immediately (no global switch).
10. **Volunteers (43)**: `GET /admin/volunteers?samithi&district&when&page` → `Paged<VolunteerEventRow>` + `meta.notifyOnSignup`; `GET /admin/volunteers/:eventId` → `VolunteerSignup[]` (first name + masked phone, audited); `PATCH /admin/volunteers/notify {notifyOnSignup}` (per user; template `volunteer_signup_alert`). Sign-ups = public-link submissions (`personal_answers`); deleted at event end + 30 days by `retention`.
11. **Reports (44)**: `GET /admin/reports` → `ReportsPayload {monthly, schedules, exportFields, recentExports, can}`; `POST /admin/reports/monthly {month, scopeId?}` → 202 `MonthlyReport`; `GET /admin/reports/monthly/:id.pdf`; `PATCH /admin/reports/schedules/:id` (`ReportSchedulePatch`); `POST /admin/exports` (`ExportRequest`, reason required) → `text/csv` attachment, logged (`export_log` + audit), no personal fields possible. Recipients are portal users; delivery via the email provider (console in dev; SMTP TODO(user)). Cron `monthly-report` (7th 06:00 IST, approved reports only; PDF via `pdf-lib`).
12. **Health (45)**: `GET /admin/health?scope&from&to` (months; default last 6) → `HealthPayload` (tiles, reporting-rate heatmap, pending approvals with age, report lag, upload rejects by reason, channel mix by `Source`, estimate share). Rows carry `href`. On time = report submitted ≤7 days after event end.
13. **Follow-up (46)**: `GET /admin/follow-up?status(open|all|…)&q&event&waitingMin&page` → `Paged<FollowUpRow>` + `meta.counts`; `GET /:id` → `FollowUpDetail` (history; view logged); `POST /:id/reveal-phone` → `{phone}` (logged); `PATCH /:id` (`FollowUpPatch`); `POST /:id/calls` (`FollowUpCall`). No export endpoint. New restricted `followup_person` + `followup_log`, filled when a report with consented follow-up rows is approved (seed backfills). Retention: 1 year after done/declined or last contact.
14. **Privacy (47)**: `GET /admin/privacy` → `PrivacyOverview`; `PATCH /admin/privacy/dpo` (`DataProtectionLead`, state); requests `GET ?status&page` → `Paged<PrivacyRequestRow>` (+counts), `GET/PATCH /:id`, `POST /:id/find|erase|reply`, `GET /:id/export.json`; `GET /admin/privacy/consents` → `ConsentSummary`; `GET /admin/privacy/retention` → `RetentionJob[]`, `PATCH /retention/:key {enabled}`; `GET/POST /admin/privacy/breaches`, `PATCH /breaches/:id` (`BreachPatch`; 72 h deadline). `privacy.read` = view; `privacy.manage` = act.
15. **Settings (49)**: `GET/PATCH /admin/settings` (`SettingsPayload`/`SettingsPatch`: flags, `LinkDefaults` {reportLinkDays 14, deskLink, otpMaxAttempts 5, otpLockMinutes 10}, `EscalationSettings` {approvalDays 3}, analytics read-only); `GET /admin/settings/seva-types` → `SevaTypeAdmin[]`, `POST` (`SevaTypeCreate`, built-in codes only), `PATCH /:code`; `GET /admin/settings/kpis` → `KpiDefinition[]`, `PATCH /:key`; `GET /admin/settings/strings?q&missing&ns&page` → `Paged<UiString>`, `PATCH /admin/settings/strings` (`UiStringPatch`; ICU placeholders must match EN). `kpi_definition` table becomes the runtime KPI source (seeded from `domain/kpi.ts`). UI-string overrides (`ui_string`) merged over `messages/*.json` in the next-intl request config. Link/OTP/escalation code reads settings instead of constants (`LINK_DEFAULTS`, `ESCALATION_DEFAULTS` are the fallbacks).
16. **Jobs**: `CronJob` += `monthly-report`, `retention` (keys of `RetentionKey`, each toggleable), `publish-scheduled`.
17. **New tables** (migration `0006_m6_portal.sql`): `form_change_request`, `upload_batch`, `upload_row` (row key → event/submission, action, issues json), `article`, `followup_person`, `followup_log`, `breach`, `export_log`, `migration_run`, `kpi_definition`, `ui_string`, `report_schedule`, `monthly_report`, `retention_run`, `user_pref`. Column adds: `partner.name_hi/contact/show_publicly/version`, `impact_estimate.period`, `seva_type.template_id/version`, `privacy_request.assignee_id/steps/version` (+ `ref` derived).

### v0.7.1 (M6 integration)
- `MigrationProblem` gains `unmatched_url` (sitemap URL that no page on the new site answers; was `slug_clash`). Migration service uses it; EN/HI strings added.
- M6 storage: JSON document tables (`id,k1,k2,version,data,created_at,updated_at`) behind `repo.m6` (`docGet/docList/docInsert/docUpdate/docUpsert/docDelete`, optional audit in same txn); lookup-key meaning per table in `repo/m6-types.ts`. Migrations `0006_m6_portal.sql` (doc tables + column adds) and `0007_m6_form_rev.sql` (`form_version.published_by`, `rev`). Legacy tables untouched.
- `FormTemplateDetail.version`, `FormDraftPatch.version` and publish `version` are the **draft revision counter** (`form_version.rev`), not the definition version. PATCH returns the full `FormTemplateDetail` (new `version`). Seva-type template mismatch 422 key is `templateId`.
- Link default OTP attempts is now 5 (was 3).
- Privacy requests list: omit `status` for all requests (`"all"` is not accepted); `open` = open statuses. `ref` is `PR-nnnn` by creation order (stable while requests are never deleted); a stored ref column is deferred.
- Follow-up PATCH and `calls` need `followup.read` only (reveal needs `followup.reveal`). List `meta.counts` keys: open/all/referred/scheduled/done/declined/unreachable. Breach `steps` always lists all five keys, `doneAt: null` when pending.
- `HomePayload.kpis` is exactly 4 tiles (padded server side) or null.
- Deferred: Devanagari in monthly PDF (Helvetica only, Hindi prints `?`), centre photo EXIF strip, `RedirectsService` 5 min cache lag.

### v0.8 (M7 — lead, before tracks)
Zod: new `src/contract/discourses.ts`; edits in `enums.ts`, `content.ts`, `auth.ts`, `endpoints.ts`, `index.ts`. Plan: `docs/progress/M7-plan.md`. §5.1/§5.4 discourse rows are superseded by this list.
1. **Enums**: `DiscourseTheme` (14 keys: character, education, discipline, ceiling_on_desires, technology, habits, parents, friendship, self_confidence, leadership, service, time, career_ethics, mental_peace; labels + catalog heading in `DISCOURSE_THEMES`), `DiscourseStatus` (not_started · ai_draft · in_review · approved · published), `DiscourseBlockStatus` (empty · ai_draft · edited · approved). Source `verse` blocks import as `poem`.
2. **`Discourse` (breaking, unused so far)**: `themes: DiscourseTheme[]` (was string[]); `quotes[]` gain `blockId: string|null`. `DiscourseSummary` unchanged shape (themes now keys).
3. **Public (15–16)**, flag `discourses` off → 404 (API + page, proxy probe for slugs): `GET /discourses?theme&q` (`DiscoursesQuery`) → `DiscoursesPayload {items: DiscourseCard[], themes:{key,label,count}[14], featured:{quote, discourse}|null, credit}` (published only, no paging); `GET /discourses/:slug` → `DiscourseDetail` = `Discourse` + `related: DiscourseSummary[≤3]`, `value: ValueSlug|null`, `translation {reviewedBy|null, publishedAt}`, `credit` (served from the publish snapshot). `ValuePayload.discourses` = ≤3 published on `VALUE_DISCOURSE_THEMES[slug]`. `DISCOURSE_CREDIT` text fixed.
4. **Workspace (39)**: `GET /admin/discourses?q&theme&status&reviewer(id|none)&page` → `Paged<AdminDiscourseRow>` + meta `AdminDiscoursesMeta {counts by status + all, flagOn, published}`; `POST /admin/discourses` (`DiscourseCreate`, EN source split on blank lines) → 201 `AdminDiscourseDetail`; `GET/PATCH /admin/discourses/:id` (`DiscoursePatch`, version → 409; quote not verbatim in its block → 422 `fields.quotes.<i>`); `GET /admin/discourses/glossary` → `GlossaryTerm[]`; `POST /admin/discourses/:id/{ai-draft|send-review|approve|publish|unpublish}` (`DiscourseAiDraftBody` / `DiscourseActionBody`) → `AdminDiscourseDetail`; blockers 422 with `fields` keys `blocks|quotes|flag_off|not_approved|reviewerId`. Pure helpers shared by editor + backend: `glossaryIssues`, `quoteMatches`, `approveBlockers` (all blocks approved, 2–4 quotes), `publishBlockers` (flag on, approved).
5. **Permissions** += `discourses.review` (approve paragraphs/discourse, assign reviewer), `discourses.publish`. RBAC: translator = edit + review; content_editor += edit, review, publish; state all.
6. **Data**: tables `discourse`, `discourse_block` (keeps imported `hi_ai`), `discourse_glossary` (migration `0008_m7_discourses.sql`). Import `scripts/import-discourses.ts` from `DISCOURSES_DIR` (text never committed; copyrighted). "Request AI draft" restores the imported draft (no live LLM). Editing a published discourse does not change the public page until re-publish (`published_snapshot`).
7. **Endpoint builders**: public `endpoints.discourses/discourse` (existing); `adminEndpoints.discourses/discourse/discourseAction/discourseGlossary`.

### v0.9 (M7.1 — discourse audio/video)
Zod: `src/contract/discourses.ts` (`DiscourseMedia`, `AdminDiscourseMedia`, `DiscourseMediaPatch`, `DiscourseMediaParams`), `endpoints.ts` (`adminEndpoints.discourseMedia`).
1. **Data**: table `discourse_media` (migration `0009_m7_media.sql`): discourse_id, kind audio|video, provider radiosai|youtube, url, external_id, title, channel, duration_s, recorded_date, official, confidence high|medium|low|null, score, source_page, approved, sort. Unique (discourse_id, url). URLs only, nothing downloaded or hosted.
2. **Import**: `pnpm db:import-discourses` also reads `$DISCOURSES_DIR/media/index.json` (matched by `n`); `--dry-run` supported; idempotent; re-import refreshes metadata but keeps `approved` and `sort`. Defaults: official Radio Sai audio approved; YouTube approved only when confidence `high`, else waits for a coordinator.
3. **Public**: `DiscourseDetail.media: DiscourseMedia[]` (approved only, `sort` order; no score/confidence/approved). Live data, not part of the publish snapshot: approving takes effect without republishing.
4. **Workspace**: `AdminDiscourseDetail.media: AdminDiscourseMedia[]` (all candidates; adds `approved`, `confidence`, `score`, `sort`). New `POST /admin/discourses/:id/media/:mediaId` body `DiscourseMediaPatch {approved?, sort?}` (at least one) → `AdminDiscourseDetail`; perm `discourses.review`; no `version` check/bump; 404 unknown media; audit `discourse.media`.
5. **Frontend**: public "Listen and watch" section under the header (native `<audio preload="none">` with Media Centre credit; YouTube click-to-load facade, thumbnail `i.ytimg.com`, iframe `youtube-nocookie.com` only after click; "unofficial recording" note when `official=false`). Editor side panel lists candidates with confidence badge, link, approve/hide. No CSP is set by the app, so no `frame-src`/`img-src` change; if one is added, allow `i.ytimg.com`, `www.youtube-nocookie.com`, `archive.sssmediacentre.org` (media-src).

### v0.9.1 (UI term "Sevadal"; internal "volunteer" identifiers kept)
User decision 24 Oct 2026: every user-visible "Volunteer" becomes **Sevadal** (EN, singular and plural; "Sevadal members" where a plural noun reads better; HI सेवादल). Done in `messages/*.json`, bot copy, WhatsApp template texts, form/KPI labels, export and PDF headers.
1. **Kept unchanged** (no migration, no API break): DB tables/columns, enum and KPI keys (`volunteer_hours`, `volunteers`), permission `volunteers.read`, contract field names (`volunteersNeeded`, `needsVolunteers`, ...), TS identifiers, i18n key names, API JSON keys, **API paths** `/api/v1/admin/volunteers*`, template codes `volunteer_reminder`/`volunteer_signup_alert`, public calendar query param `?volunteers=1`.
2. **URL**: portal page `/admin/volunteers` is now `/admin/sevadal`. `src/proxy.ts` answers old `/admin/volunteers[/...]` and `/hi/...` with 301 to the new path (sub-path and query kept).
3. **Proxy fix**: detail-path existence probe now consults `redirects.resolve(pathname)` before the 404 rewrite (retired district slugs 301 to `/impact`).
4. Probe retries once on error (cold start); only two consecutive errors fail open (logged), never cached.

### v0.9.2 (discourse editor: discard / restore)
Zod: `src/contract/discourses.ts` (`DiscourseRevertBody`, `AdminDiscourseBlock`/`AdminDiscourseDetail` additions), `endpoints.ts` (`discourseAction` accepts `"revert"`).
1. **`POST /admin/discourses/:id/revert`** (perm `discourses.edit`; body carries `version`, mismatch 409) body `{version, scope:"all"}` or `{version, scope:"block", blockId, source:"published"|"ai"}` -> `AdminDiscourseDetail`, version +1, audit `discourse.revert` (data: scope, source/blockId or which parts differed; no text).
2. **`all`**: needs a publish snapshot and something different (else 422 `fields.status`). Restores from `published_snapshot`: block Hindi (status `approved`), quotes, title, why, themes; discourse status `published`. `publishedAt`/snapshot/public page untouched.
3. **`block`/`published`**: that paragraph's Hindi back to the snapshot, status `approved` (or `empty` if the snapshot had none); discourse returns to `published` only when nothing else differs, else stays as it was. 422 `fields.source` when no snapshot block or already equal. **`block`/`ai`**: Hindi = `hi_ai`, status `ai_draft`, discourse demoted like an edit; 422 when no draft or already equal. Unknown block 422 `fields.blockId`.
4. **Detail additions**: `dirtySincePublish` (snapshot exists and text/quotes/title/why/themes differ; paragraph status alone does not count), `dirtySummary {blocks, quotes, title, why, themes}`; per block `differsFromPublished`, `published: {hi}|null`, `aiDraft: string|null` (preview text).
5. **UI**: per paragraph "Restore..." button (shown when the published or AI text differs from the current) opens a dialog comparing current vs each source; workflow bar "Discard changes since publish" (when dirty) opens a confirm dialog listing what is replaced. Pending typing is flushed first before a revert.

### v0.9.3 (WhatsApp event messages; Hugging Face extractor)
Zod: `src/contract/whatsapp.ts` (`EventExtractKind`, `EventExtract`). Server: `src/server/ai/event/{rules,normalise,model,draft,score,index}.ts`, `src/server/ai/{hf,llm}.ts`.
1. **`EventExtract`** — one schema for every seva type, read from a WhatsApp message. Empty = `null` (lists `[]`); text as written, only dates/times normalised. `kind` (`announcement` upcoming | `report` already held | `other` no event), `sevaType|null`, `title` (headline, greeting dropped), `samithi {raw, slug|null, name|null}` (slug from `sssso-units.json`; GGN/FBD/GZB/GBN/Noida + Delhi directions), `date`/`endDate` (ISODate IST; `endDate` only multi-day), `startTime`/`endTime` ('HH:MM' 24 h), `startsAt`/`endsAt` (ISODateTime for `EventInput`), `recurrence {text, weekday 0=Sun|null}`, `venueName` (venue line as written, e.g. "Sai Seva Bhawan, Karol Bagh"), `venueAddress` (only from its own Address line), `partner`, `topic`, `audience`, `services[]`, `bring[]`, `volunteersNeeded`, `target {count, unit}`, `contact {name, phone as written}`, `sevadalNote`, `fieldConfidence {field: {level, why}}`, `rejected [{field, value, reason}]` (model values dropped by the type check or grounding; `field "*"` = reply unusable), `model`. Never saved as-is: input for Plan event / inbox. Contact is personal data: draft only, retention as inbox.
2. **`Extractor.extractEvent({text, now})`** on every adapter (replaces `extractAnnouncement`). Rules read labelled lines (high) and patterns (check). `hf` and `ollama` then ask the model only for empty fields the message has a cue for (no model call for greetings/quotes). The reply is type-checked per key (`ModelReply`: zod with coercion of "null"/"N/A", numeric strings, comma lists; unknown keys and wrong types → `rejected`), normalised with the rules' parsers, and kept only if visible in the message (≥80% of words; date written/relative or day+weekday; time hour; numbers; phone digits). Kept values are `low`. Failure/timeout/non-JSON → rules result.
3. **`EXTRACTOR_PROVIDER=hf`**: `@huggingface/transformers` loads `HF_MODEL` (default `onnx-community/LFM2.5-350M-ONNX`, `HF_DTYPE=q4`; LFM Open License v1.0 — free below a revenue threshold; Apache-2.0 fallback `HuggingFaceTB/SmolLM2-360M-Instruct`) once per process into `HF_CACHE_DIR` (default `.cache/huggingface`, gitignored); calls one at a time. ~350M q4 ~1 GB RAM, 1–6 s per call warm. Report counts (`extractFields`) also work with `hf`.
4. **Evals**: `tests/evals/event-extract.cases.json` (45 synthetic cases, fictional names/phones; EN/Hinglish/Devanagari, labelled/prose, multi-day, recurring, non-events). `pnpm eval:events [--hf] [--variant=keys|skeleton|fewshot] [--case=id] [--out=file.md]` → field accuracy, hallucination, miss rate, type-check/grounding rejects, latency. Reports in `docs/evals/`. `tests/event-eval.test.ts` keeps the rules-only floor (accuracy ≥ 90%, hallucination ≤ 2.5%). Results 27 Oct 2026 (SmolLM2-360M q4): rules 90.5% field accuracy / 1.4% invented / 14 of 45 cases perfect; + model `fewshot` (default) 91.1% / 1.4% / 15, p50 2.1 s per call; `keys` 90.8% (21/33 replies without JSON); `skeleton` 90.6% (model rarely contributes). First run before tighter grounding: model made it worse (fewshot 88.8%, 5.2% invented) — grounding matters more than the prompt. Model comparison 27 Oct 2026 (`docs/evals/models/README.md`, 8 small ONNX models): all 90.2–91.2%; best LFM2.5-350M fewshot 91.2% / 1.7% invented, p50 1.2 s, 280 MB → default `HF_MODEL`.
5. **Dev**: `pnpm ai:event <file|-> [--hf|--rules] [--now=YYYY-MM-DD]` prints the draft JSON.
6. **Wired (v0.9.4)**: Plan event prefill — see below. Bot/inbox ingest still drafts report counts only (`extractFields`); announcements reach Plan event through the inbox link.

### v0.9.4 (Plan event from a WhatsApp message)
Zod: `src/contract/whatsapp.ts` (`EventFromMessageBody`, `EventFromMessage`, `PlanField`). Server: `src/server/services/portal/event-from-message.ts` (`planPrefill`, `eventFromMessage`), `AdminEventsService.fromMessage(actor, text)`.
1. **`POST /api/v1/admin/events/extract`** (`events.plan`, CSRF) body `{text}` (3–4000 chars) **or** `{inboxId}` (needs `inbox.review` + scope; 422 `fields.inboxId` when the item has no text) → `EventFromMessage {extract: EventExtract, prefill, check: PlanField[]}`. Saves nothing, no audit. `prefill`: `sevaType`, `title`, `date`/`startTime`/`endTime` (IST, as the form takes them), `samithiId` (only when the message's samithi slug resolves and is in the viewer's scope), `venueName`, `venueAddress`, `volunteersNeeded`, `bring[]`, `description` (EN lines: Topic/For/With/Services/Every/Sevadals — contact left out), `recurring`. `check`: required form fields still blank (`sevaType`, `title`, `startsAt`, `samithiId`, `venueName`) plus any whose source fields are not `high`.
2. **Plan event page**: "Fill from a WhatsApp message" panel (new events only) posts `{text}` and fills the form; an Alert lists fields to check. `/admin/events/new?from=<inboxId>` prefills server-side (silently ignored when out of scope / no text).
3. **Inbox item**: the "create event" link becomes "Plan an event from this message" → `?from=<id>` when the item has text.
4. Rules fix: "Sevadals needed: 12" form; volunteer counts no longer read a number from the previous line; "report", "log aaye", "people came" mark a report, and a relative day in a report reads backwards ("kal ka report" = yesterday). Rules eval 90.9%.
### v0.9.5 (Gallery: public, portal, WhatsApp intake)
Spec `docs/specs/52-gallery.md`. (The WIP note said v0.9.3; that number is taken.) Admin paths are under `/api/v1`. All admin writes need CSRF; `gallery.upload` = every coordinator + content editor, `gallery.review` = district coordinator, content editor, state admin. Reads need either. Out of scope = 404.
1. **Zod**: `src/contract/gallery.ts` (`GalleryAlbum*`, `GalleryQuery/Facets/Page`, `AdminGallery*`, `PhotoEdits`, `Gallery*Body/Patch/Create/UploadForm`, `GalleryFileQuery`, `GALLERY_LIMITS`). Endpoint builders in `endpoints.ts`.
2. **Public**: `GET /gallery?year&kind&page&pageSize` → `{data: GalleryAlbum[], meta, facets}`; `GET /gallery/:slug` → `GalleryAlbumDetail` (404 unknown). Sources: published portal albums (approved photos only, cover first then order; `kind` `event` when linked to an event else `album`; slug = album slug), published articles with ≥2 photos, legacy slider (`highlights`), event results photos, centre photos. A portal album linked to an event absorbs that event's results photos (no second `event-<id>` card). Pending/rejected/private files never appear. Proxy 404 probe for `/gallery/<slug>` (EN + `/hi`), sitemap lists `/gallery` + every album slug. Cache tag `gallery` (`CACHE_TAGS.gallery`) is revalidated on publish/unpublish, approve/reject/edit of a photo in a published album.
3. **Admin endpoints**
   - `GET /admin/gallery/photos?status=pending|approved|rejected&albumId|none&page&pageSize` (view) → list of `AdminGalleryPhoto`, `meta.counts {pending, approved, rejected}` (for the album filter, ignoring `status`).
   - `POST /admin/gallery/photos` (`gallery.upload`, multipart `file` ≤10 MB JPG/PNG/WebP + `albumId?` + `caption?`) → 201 pending photo. 422 `fields.file` bad type/size, `fields.albumId` unknown album.
   - `GET /admin/gallery/photos/:id` (view) → photo. `PATCH` (`gallery.review`, `GalleryPhotoPatch`: `version`, `caption?`, `alt?`, `albumId?|null`, `setCover?`) → photo. 409 stale; 422 `fields.setCover` (needs an approved photo in an album) / `fields.albumId` (approved photo cannot leave albums, unknown album).
   - `POST /admin/gallery/photos/:id/edit` (`gallery.review`, `{version, edits: PhotoEdits|null, caption?, alt?, setCover?}`) → photo with `revision+1`; renders a NEW derived file from the original; `edits:null` = revert (revision still +1). Approved photos are republished (new public file, old deleted).
   - `POST …/:id/approve` (`gallery.review`, `{version, albumId?}`) → photo; 422 `fields.albumId` when it has no album; 409 when already approved. Writes the stripped JPEG to public media; first approved photo becomes the album cover when none is set.
   - `POST …/:id/reject` (`gallery.review`, `{version, reason}`) → photo; deletes the public file, clears cover if it was.
   - `POST /admin/gallery/photos/bulk` (`gallery.review`, `{action, ids[≤100], albumId?, reason?}`) → `{done: string[], failed: {id, code}[]}`; 422 when `reject` has no reason.
   - `GET …/:id/file?variant=preview|original&rev` (view) → `image/jpeg` bytes, metadata stripped, `Cache-Control: private, no-store`. `preview` ≤1200 px current rendering; `original` ≤2400 px unedited (audited `gallery.photo.view_original`).
   - `GET /admin/gallery/albums?status&page&pageSize` (view; scoped, newest date first) → list of `AdminGalleryAlbum`; `GET /admin/gallery/albums/:id` → `AdminGalleryAlbumDetail` (photos in order).
   - `POST /admin/gallery/albums` (`gallery.upload`, `GalleryAlbumCreate`) → 201 album. `eventId` set: event must be in scope (404), existing album for that event is returned instead of a new one; title/date default from the event; scope = event's samithi. No event: `title` required (422 `fields.title`), scope = `scopeId` or actor scope.
   - `PATCH /admin/gallery/albums/:id` (`version`, title/description/date need `gallery.upload` while draft; `status`, `coverPhotoId`, `photoOrder` or editing a published album need `gallery.review`) → album. 409 stale; 422 `fields.status` (publish needs ≥1 approved photo), `fields.coverPhotoId` (must be an approved photo of the album), `fields.photoOrder` (unknown/duplicate ids). Publishing with no cover picks the first approved photo.
4. **Tables** (migration `0010_gallery`, JSON doc tables like M6, keys): `gallery_album` (k1 scopeId, k2 status), `gallery_photo` (k1 albumId or `none`, k2 status). Legacy tables untouched. Audit actions: `gallery.photo.{intake,upload,assign,withdraw,approve,reject,edit,revert,update,view_original}`, `gallery.album.{create,update,publish,unpublish}`.
5. **Storage**: private (`MEDIA_PRIVATE_ROOT`) `gallery/orig/<id>.<ext>` (original, never public, kept on reject), `gallery/derived/<id>-r<n>.jpg` (edited rendering). Public (`MEDIA_ROOT`, served at `/media/*`) `gallery/<id>-r<n>.jpg` only while approved. `src/server/media/image.ts` (`probe`, `render`): EXIF auto-orient → rotate → flip → crop (fractions of the rotated+flipped image) → brightness/contrast → fit 2400 px → JPEG q85, no EXIF/GPS/ICC/XMP.
6. **Limits**: `GALLERY_LIMITS` 10 MB, JPEG/PNG/WebP sniffed from bytes (declared type ignored), must decode.
7. **WhatsApp**: an image from a sender with `gallery.upload` outside any flow starts flow `gallery` (`src/server/whatsapp/bot/gallery.ts`; engine runs it after the open-ask reply check, so an open inbox question still wins). Bytes missing → "couldn't download"; bad type / >10 MB → clear reply, nothing stored; others → "Only coordinators can send photos". Photo stored pending (scope = sender's unit), then a list: `g:y` "Yes, <event>" (single event in scope held today/yesterday), up to 8 recent events (14 days) + draft/published albums (`g:e:<eventId>`, `g:a:<albumId>`), and `g:no` "Not for the gallery" → photos are removed from the gallery and ingested into the review inbox (bytes kept there), reply `sentToReview`. More photos during the flow join the batch (short "Added. N photos so far" ack each). A choice assigns the batch (album created/reused for events) and replies "Thank you — N photos are waiting for review." Photo caption → EN caption. Hindi copy agent-written (needs native review). Cancel/timeout leaves the photos pending without an album (reviewers can assign).
8. **Ports**: `PortalServices.gallery: AdminGalleryService` (`portal/gallery-types.ts`) plus `withdraw(actor, photoIds)` (added: returns bytes of pending WhatsApp photos and deletes them, used by "Not for the gallery"). `Services.gallery: GalleryService` (public).
9. **Simulator**: `SimInboundBody.media.data` (base64) is decoded to bytes in `POST /dev/whatsapp/inbound` (≤11 MB decoded, else 422); without `data` the media has no bytes (bot answers "couldn't download").
10. **Tests**: `tests/gallery-{image,review,editor,public,intake}.test.ts`, proxy probe in `tests/proxy.test.ts`.


### v0.9.6 (Review round 1 — public polish + portal fixes)
1. **`VALUE_LINKS.dharma`** (`src/contract/public.ts`): now `medical` / `service` / `gathering: null` (Dharma page features medical camps, not Bal Vikas).
2. **`DELETE /admin/forms/:id`** → 204 (`forms.manage`, CSRF). Archives the template (`active=false`, hidden from list). 422 `details {reason: "links"|"pinned"|"last", count}` while live links use it, Settings pins it as a seva type's report form, or it is the last report form of that seva type. Audit `form.delete`.
3. **`DELETE /admin/uploads/:id`** → 204 (`uploads.manage`, CSRF). Removes batch, rows and stored file. 422 for loaded batches (they are the record of where reports came from). Audit `upload.delete`.
4. **WhatsApp bot**: `resolveDistrict` falls back to nearest centre by pincode centroid (`ncr-pincodes.json`) when the text search finds no centre.
5. **Portal 404**: `admin/(portal)/not-found.tsx` catches `notFound()` from `guarded()` (was Next default 404).
