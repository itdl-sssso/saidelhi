# SSSSO Delhi NCR platform: page specs for the designer agent

Version 1 · 19 October 2026 · Source of truth for wireframes and high-fidelity screens.

Read this file first, then the spec for the page you are designing. Every spec follows the same structure: route, audience, priority, job, content and sections from top to bottom, states, actions, links, language, privacy, mobile, and acceptance checks.

## Product in one paragraph

A website that **replaces saidelhi.org** for the Sri Sathya Sai Seva Organisation, Delhi NCR. It has three parts:
1. A **bilingual public site** (Hindi and English) showing values, seva programmes, upcoming events, centres and public impact numbers.
2. A **coordinator portal** at `/admin`, where samithi, district and state coordinators plan events, collect data through event-specific form links, review incoming data, approve it and publish content.
3. A **WhatsApp bot**, which is how most coordinators plan activities, report totals, approve and log in.

## Design system

- Use the **SSSSO Delhi NCR Design System** (claude.ai artifact `Q6rrSmXttxZMARsDmMmSKf`): Playfair Display for headings, Inter for body text.
  - Prem pink (`--pink-*`) is the action colour.
  - Shanti blue (`--blue-*`) is for structure and information.
  - Gold (`--gold-300`) is the Sarva Dharma hairline rule.
  - Cream (`#FAFAFA`) for pages, white cards, slate text, and the blue-700 footer.
- Buttons are pill-shaped. Cards have a 16px radius, a 1px border and `--shadow-sm`. Shadows stay soft. No gradients, except the hero wash from blue-50 to cream.
- Use the system's components where they exist: Button, Badge, Eyebrow, DharmaRule, Icon (Lucide, stroke 1.75), Input, Select, Checkbox, Switch, Card, SectionHeading, QuoteCard, SevaCard, EventScheduleCard, NavBar, Tabs, Alert, Dialog.
- **Gaps you must fill, and add back to the design system:**
  - Devanagari typeface. Inter has no Hindi glyphs. Pair it with **Noto Sans Devanagari** for body text and **Noto Serif Devanagari** (or Mukta) for headings.
  - Admin shell: side navigation, top bar, scope switcher.
  - Data table: sorting, filters, bulk select, pagination.
  - Status pill set for the event lifecycle (below).
  - KPI tile, sparkline and simple charts: bar, line, district map.
  - Form field kit: number, date, time, select, multi-select, yes/no, repeater rows, file or photo upload, inline error, help text.
  - Stepper, toast, empty state, skeleton loader, side sheet.
  - Form builder canvas: palette, canvas, settings panel.
- **Sarva Dharma emblem:** not supplied yet. Use the dashed placeholder ring from NavBar. Never draw a substitute.
- **Photos:** none supplied. Leave image slots with real aspect ratios and alt-text notes. Never show identifiable beneficiaries or children.

## Voice and copy

- Warm, plain, unhurried. "We" for the organisation, "you" for the reader.
- Sentence case everywhere. No exclamation marks. **No emoji.**
- Gloss Sanskrit terms on first use in a section, e.g. "seva (service)".
- Say **district**, never "zone". The hierarchy is **Delhi NCR → district → samithi** (a centre is a samithi's public face).
- Say *sevadals* and *coordinators*, never *users*.
- Numbers: Indian grouping (1,23,456). Dates as "17 Oct 2026". Times as "5:30 PM".

## Language

- **Every screen exists in Hindi and English** from day one. Show a हिंदी / EN toggle in the public nav and the portal top bar.
- Design for Hindi strings running about 20–30% longer. No fixed-width text containers.
- User-entered data (venue names, notes) is shown as entered and not translated.

## Breakpoints

- Phone 375px first. Most coordinators use phones. Tablet 768px. Desktop 1200px container.
- Minimum touch target 44px. Body text 17px on public pages, 15px in the portal.

## Event lifecycle status pills (use exactly these)

| Status | Meaning | Colour family |
|---|---|---|
| Draft | Bot or form created it; coordinator hasn't confirmed | slate |
| Awaiting approval | Sent to the district | yellow |
| Planned | Approved, shown publicly as upcoming | blue |
| Awaiting report | Event date passed, no report yet | pink |
| Report submitted | Report in; waiting for district approval | yellow |
| Approved | Results final and public | green (`--signal-success`) |
| Cancelled / Postponed | Self-explanatory | slate, struck-through date for cancelled |
| Escalated | District didn't respond in 3 days; with the state | alert (`--signal-alert`) |

Colour never carries meaning alone: every pill has a text label.

## Data rules the design must respect

- **Public pages show approved data only.** Rough historical figures carry an "Estimate" badge and a tooltip: "Rough figure supplied by the district for years before the platform."
- **Public detail:** samithi-level totals are allowed. Breakdowns by age or gender appear only at district level or above, and any count under 5 shows as "fewer than 5".
- "People served" always carries a note: "Counts services given; one person may attend more than once."
- **No ID numbers anywhere.** Never design a field for Aadhaar or any ID. Personal data appears only in restricted screens (Follow-up, Privacy) and is visibly marked "Personal data".
- **Donate** links to the existing saidelhi.org donation page, opening in a new tab. **SaiConnect** is an external link. Nothing is collected from the public on this site.

## Roles (portal)

| Role | Scope |
|---|---|
| Samithi coordinator | One samithi |
| District coordinator | One district |
| State admin | Everything |
| Content editor | State media/IT team: content, impact controls |
| Translator / reviewer | Discourses workspace only (LTST volunteers) |
| PII officer | Follow-up and privacy screens |

Menu items a role can't use are hidden, not disabled.

## Sample data (use in mocks)

- **Real camp, aggregate figures only:**
  - Eye camp, 17 Oct 2026, Dr. Ambedkar Bhawan, Mayur Vihar Phase-1, with ICARE Eye Hospital.
  - 115 people registered and screened. 63 reading spectacles given: +1.0 ×12, +1.5 ×10, +2.0 ×20, +2.5 ×14, +3.0 ×7.
  - 13 cataract found.
- **Districts (real, 24 Oct 2026):** Central, East, North, South East, South West, West, Faridabad, Gurugram, Gautam Buddh Nagar, Ghaziabad.
- **Names in mocks** must be obviously fictional and generic (e.g. "Coordinator A", "Samithi Mayur Vihar"). Never copy names from real registers.

## Feature flags

- `discourses`: Discourses pages and nav item are hidden until the Sri Sathya Sai Sadhana Trust grants permission. Design them fully, and show the nav item with a small "Flag" note in the sitemap only.

## Priority key

- **P0** needed for the one-district pilot.
- **P1** needed for state-wide rollout.
- **P2** later.

## Page index

### Public site
| # | Page | Route | Priority | Status |
|---|---|---|---|---|
| 01 | Home | `/` | P0 | Wireframed, update |
| 02 | Value (×5 template) | `/values/[sathya|dharma|shanti|prema|ahimsa]` | P1 | Wireframed, update |
| 03 | About | `/about` | P1 | New |
| 04 | Impact | `/impact` | P0 | New |
| 05 | Programs | `/programs` | P1 | New |
| 06 | Program (template) | `/programs/[type]` | P1 | New |
| 07 | Articles | `/news` | P1 | Wireframed |
| 08 | Article | `/news/[slug]` | P1 | Wireframed, update |
| 09 | Calendar | `/calendar` | P0 | Wireframed, update |
| 10 | Event | `/events/[id]` | P0 | New |
| 11 | Join a seva | `/join` | P1 | New |
| 12 | Map (centre locator) | `/centres/map` | P1 | Wireframed, update |
| 13 | District | `/districts/[slug]` | P1 | New |
| 14 | Centre | `/centres/[slug]` | P0 | New |
| 15 | Discourses | `/discourses` | P2, flag | New |
| 16 | Discourse | `/discourses/[slug]` | P2, flag | New |
| 17 | Privacy and data requests | `/privacy` | P0 | New |
| 18 | Not found / error | `/404`, `/500` | P1 | New |

### Event form links (public-facing, token-protected)
| # | Page | Route | Priority |
|---|---|---|---|
| 19 | Form link: verify | `/f/[token]` | P0 |
| 20 | Form fill | `/f/[token]/form` | P0 |
| 21 | Form submitted | `/f/[token]/done` | P0 |
| 22 | Link expired / invalid | `/f/[token]` (error state) | P0 |

### Coordinator portal
| # | Page | Route | Priority |
|---|---|---|---|
| 23 | Login (WhatsApp OTP) | `/admin/login` | P0 |
| 24 | Overview | `/admin` | P0 |
| 25 | Events list | `/admin/events` | P0 |
| 26 | Event detail | `/admin/events/[id]` | P0 |
| 27 | Plan / edit event | `/admin/events/new`, `/admin/events/[id]/edit` | P0 |
| 28 | Review inbox | `/admin/inbox`, `/admin/inbox/[id]` | P0 |
| 29 | Approvals | `/admin/approvals` | P0 |
| 30 | Form templates | `/admin/forms` | P1 |
| 31 | Form builder | `/admin/forms/[id]/edit` | P1 (pilot uses hand-written forms) |
| 32 | Form links | `/admin/links` | P0 |
| 33 | Uploads | `/admin/uploads`, `/admin/uploads/new` | P1 |
| 34 | Districts and samithis | `/admin/org` | P0 |
| 35 | Centres | `/admin/centres`, `/admin/centres/[id]` | P1 |
| 36 | Partners | `/admin/partners` | P1 |
| 37 | People and access | `/admin/people` | P0 |
| 38 | Content | `/admin/content`, `/admin/content/[id]` | P1 |
| 39 | Discourses workspace | `/admin/discourses`, `/admin/discourses/[id]` | P2 |
| 40 | Public impact controls | `/admin/impact` | P1 |
| 41 | Migration import | `/admin/migration` | P1 |
| 42 | WhatsApp | `/admin/whatsapp` | P1 |
| 43 | Volunteer sign-ups | `/admin/volunteers` | P1 |
| 44 | Reports and exports | `/admin/reports` | P1 |
| 45 | Data health | `/admin/health` | P1 |
| 46 | Follow-up (restricted) | `/admin/follow-up` | P1 |
| 47 | Privacy (restricted) | `/admin/privacy` | P1 |
| 48 | Audit log | `/admin/audit` | P1 |
| 49 | Settings | `/admin/settings` | P1 |

### WhatsApp
| # | Spec | Priority |
|---|---|---|
| 50 | WhatsApp bot conversations | P0 |

### Wireframe order
1. **First batch, the pilot's core:** 24 Overview, 26 Event detail, 28 Review inbox, 32 Form links, 20 Form fill.
2. **Then the public core:** 10 Event, 14 Centre, 04 Impact, 09 Calendar.
3. **Then everything else, P0 before P1.**
