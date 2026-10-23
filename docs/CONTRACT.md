# Dev contract — SSSSO Delhi NCR platform

Status: **v0.2 — accepted** · 22 Oct 2026 (v0.2: M0 backend amendments, see §10)
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
| AI extraction | Provider interface `Extractor`; adapters `stub` and `ollama` (local small model, e.g. Qwen2.5-7B-Instruct / Llama-3.2-3B, JSON-schema constrained output). Switch: `EXTRACTOR_PROVIDER`, `OLLAMA_URL`, `OLLAMA_MODEL`. AI never writes final data — only inbox drafts. |
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
| `GET /values/:slug` | value content + related events/discourses | 02 |
| `GET /impact?period=this_year|last_year|all&district=` | `{ tiles, bySevaType, byDistrict, trend:{month,figure}[], recent:EventPublic[5], methodNote }` | 04 |
| `GET /programs?wing=` · `GET /programs/:type` | program list / detail with KPIs, funnel, upcoming, articles, partners | 05–06 |
| `GET /articles?c=&page=` · `GET /articles/:slug` | `Paged<Article>` / `Article` + prev/next/related | 07–08 |
| `GET /events?from&to&district&sevaType&samithi&needsVolunteers&page` | `Paged<EventPublic>` (status ≥ planned) | 09 |
| `GET /events/:id` | `EventPublic` | 10 |
| `GET /join?district&sevaType&from&to` | events needing volunteers + WhatsApp opt-in info | 11 |
| `GET /centres?q=&district=` · `GET /centres/:slug` | centre list (with next gathering, distance if pincode) / detail | 12, 14 |
| `GET /districts/:slug` | district page payload | 13 |
| `GET /discourses?theme&q` · `GET /discourses/:slug` | flag-gated (404 when off) | 15–16 |
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
4. Real district / samithi list (placeholder: Central, East, New Delhi, North, South, West, Gurugram, Noida–Ghaziabad, Faridabad).
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
