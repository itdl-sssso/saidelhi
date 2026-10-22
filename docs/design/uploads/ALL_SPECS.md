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
- **Districts (placeholder list until confirmed):** Central, East, New Delhi, North, South, West, Gurugram, Noida–Ghaziabad, Faridabad.
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


---

# 01 · Home
**Route** `/` · **Audience** public, first-time visitors and members · **Priority** P0 · **Status** wireframed (A2 3D Lotus Journey), update

## Job
Welcome people, show what the organisation does and what's coming up, and route them to a centre, an event or the impact story.

## Sections (top → bottom)
1. **NavBar:**
   - Emblem placeholder.
   - Links: About, Programs, Bhajans, Get involved, Impact, News, Calendar, Discourses (flag), Donate (external), SaiConnect (external).
   - हिंदी / EN toggle and "Coordinator login" as a quiet text link.
2. **Hero (existing 3D lotus journey):** keep it. Add a Thought for the Day QuoteCard.
3. **Five values petals** (existing) → Value pages.
4. **Upcoming seva strip (new):** 3–6 EventScheduleCards for the next approved events. Each shows date chip, seva type icon, title, samithi, district and "Volunteers needed: 6". Ends with "All upcoming seva" → Calendar.
5. **Impact snapshot (new):** 4 KPI tiles for this year. Activities, people served, blood units collected, spectacles given. Each has a small "Approved figures" caption. "See our impact" → Impact.
6. **Wings and programmes (#seva):** wing cards → Programs.
7. **News and activities:** latest 3 articles → Article; "See all" → Articles.
8. **Centenary chips** (existing).
9. **Find a centre:** search by pincode or locality, plus a small map preview → Map.
10. **Get involved (#involve):** "Join a seva" → Join a seva; "Join the WhatsApp updates" (opt-in explainer).
11. **Shared footer:**
    - Columns: Impact, Calendar, Centres, Join a seva, Privacy, Donate (external), SaiConnect (external).
    - Disclaimer: "All activities are free and open to people of every faith."
    - Gold 3px rule above the footer.

## States
- No upcoming events: the strip shows "No seva is planned this week. See the calendar for later dates."
- Impact data not yet available (pilot start): hide the KPI tiles; show the Programs teaser instead.

## Links out
Value ×5, Event, Calendar, Impact, Programs, Article, Articles, Map, Join a seva, Privacy. Donate and SaiConnect open in a new tab.

## Language and mobile
- The hero must work in Hindi.
- At 375px the upcoming strip becomes a horizontal scroll with snap; KPI tiles go 2×2.

## Acceptance
- No more than 2 tinted section backgrounds.
- The upcoming strip and impact tiles show the sample data.
- The Donate link is visibly external.


---

# 02 · Value (template for Sathya, Dharma, Shanti, Prema, Ahimsa)
**Route** `/values/[slug]` · **Audience** public · **Priority** P1 · **Status** wireframed, update

## Job
Explain one of the five human values and connect it to the seva wing and activities that express it.

## Sections
1. Breadcrumb: Home › Values › Prema.
2. Hero: value name in English and Sanskrit, a one-line meaning, a quote (QuoteCard).
3. Body: what the value means in daily life (prose, 66ch).
4. **"Lived through" (new):** link card to the matching programme/wing:
   - Prema → Service wing programmes.
   - Dharma → Bal Vikas / Education.
   - Shanti → Bhajans and study circles.
   - Sathya and Ahimsa → Programs overview.
5. **Related discourses (new, flag `discourses`):** 3 discourse cards on this theme → Discourse.
6. Upcoming events for the matching wing (2–3 EventScheduleCards).
7. **Previous / next value navigation (new):** cycles through all five.
8. Shared footer, replacing the old "Bhajan timings / Plan a visit" footer.

## States
With the `discourses` flag off, section 5 is hidden with no gap left behind.

## Acceptance
- Previous/next present; Sathya and Ahimsa reachable without Home.
- The footer matches Home exactly.


---

# 03 · About
**Route** `/about` · **Audience** public · **Priority** P1 · **Status** new (replaces Home #act2 anchor)

## Job
Say who we are, how we're organised, and that everything is free and open to all faiths.

## Sections
1. Hero: "Who we are", with a short paragraph.
2. Our founder and inspiration: short, respectful text, with an image slot.
3. Three wings (Spiritual, Educational, Service) plus the Mahila and Youth wings, as cards → Programs filtered by wing.
4. **How we're organised:** a simple diagram, Delhi NCR → 9 districts → samithis. Districts listed as links → District.
5. Our principles: free always, open to every faith, no collection from the public.
6. "Find a centre near you" → Map.

## Acceptance
- The hierarchy diagram uses "district".
- No donation ask on this page beyond the footer link.


---

# 04 · Impact
**Route** `/impact` · **Audience** public, press, partners, members · **Priority** P0 · **Status** new

## Job
Show credibly, in numbers, the seva done across Delhi NCR. Only approved data.

## Sections
1. **Hero:**
   - "Seva across Delhi NCR", plus a period selector (This year · Last year · All time) and a district filter.
   - Caption: "Figures are approved by district coordinators. Updated nightly."
2. **Headline tiles:** activities held · people served (with note) · volunteer hours · districts and samithis active.
3. **By seva type:** one card per type with 2–3 figures and a link → Program.
   - Blood: camps, units collected, donors.
   - Eye: screened, spectacles given, cataract surgeries.
   - Medical: camps, patients seen.
   - Narayan Seva: meals, ration kits.
   - Bal Vikas: classes held, children enrolled.
4. **District map:** choropleth or bubble map of activities by district; tap → District. Include a table fallback beside or below it.
5. **12-month trend:** activities per month, a line or bars. Months with estimates use a hatched fill plus the legend "Estimate".
6. **Recent completed events:** 5 rows linking to Event.
7. Method note (collapsible): how figures are counted, the double-counting note, the under-5 rule, what "estimate" means.

## States
- Loading skeletons.
- A district with no data: "No approved activity yet."
- With the estimate toggle (state can hide estimates), the label shows in the legend.

## Privacy
No demographics below district level. Show "fewer than 5" in place of small numbers.

## Mobile
Tiles 2×2. The map becomes a ranked district list with bars.

## Acceptance
- Every number has a visible period.
- Estimates are visually distinct and labelled.
- The method note is present.


---

# 05 · Programs
**Route** `/programs` · **Audience** public · **Priority** P1 · **Status** new (replaces "Programs → Home #seva")

## Job
List every seva programme so visitors can find one that interests them.

## Sections
1. Hero: "Our seva (service) programmes".
2. Filter tabs by wing: All · Service · Educational · Spiritual · Mahila · Youth.
3. Grid of SevaCards:
   - Programmes: Eye camps, Blood donation, Medical camps, Narayan Seva (food), Bal Vikas (children's values classes), Bhajans and study circles, Disaster relief, Cleanliness drives, Others.
   - Each card has an icon (Lucide vocabulary from the design system), a one-line description, "Next: 26 Oct · Noida", and "This year: 1,240 meals" when available.
4. CTA band: "Join a seva" → Join a seva.

## Acceptance
3-up on desktop, 1-up on phone. Every card links → Program.


---

# 06 · Program (template per seva type)
**Route** `/programs/[type]` · **Audience** public · **Priority** P1 · **Status** new

## Job
Explain one programme, show its results and upcoming events, and invite people to help.

## Sections
1. Breadcrumb: Home › Programs › Eye camps.
2. Hero: name, a one-paragraph description, the wing badge, an image slot (no identifiable patients).
3. **What happens at a camp:** a short 3–4 step explainer (e.g. registration → screening → spectacles → cataract referral).
4. **Results so far:** 3–4 KPI tiles for this type. Eye camp example: screened · spectacles given · cataract found → referred → operated, as a small funnel.
5. **Upcoming:** EventScheduleCards → Event.
6. **Recent reports:** related articles → Article.
7. Partners (logos as text until supplied), e.g. "With ICARE Eye Hospital".
8. CTA: "Volunteer at a camp" → Join a seva, pre-filtered.

## Variants
Blood, Eye, Medical, Narayan Seva, Bal Vikas, Generic (for "Others"). Only the KPI tiles and explainer steps change.

## Acceptance
- The eye camp variant uses the sample data.
- The funnel shows referred and operated as "—" when not yet reported, never 0.


---

# 07 · Articles
**Route** `/news?c=all|news|activities|centenary` · **Audience** public · **Priority** P1 · **Status** wireframed

## Job
Browse news and activity write-ups, including content migrated from saidelhi.org.

## Sections
1. Breadcrumb, then a heading.
2. Category Tabs (filter in place, URL `?c=`).
3. Card grid: image slot, category badge, title, date, district. 12 per page plus pagination.
4. "Older news on the previous site" note, if any content wasn't migrated.

## States
An empty category shows "Nothing here yet."

## Acceptance
Migrated articles look identical to new ones.


---

# 08 · Article
**Route** `/news/[slug]` · **Audience** public · **Priority** P1 · **Status** wireframed, update

## Job
Read one story.

## Sections
1. Breadcrumb: Home › News › Activities.
2. Title, date, district badge, reading time.
3. Body with image slots and pull quotes.
4. **Linked event box (new):** if the article reports on an event, show a compact results card ("115 screened · 63 spectacles") → Event.
5. Previous / next, related articles, "See the calendar".

## Acceptance
Hindi and English versions switch with the toggle. A missing translation shows "This article is available in English only".


---

# 09 · Calendar
**Route** `/calendar` · **Audience** public, members, volunteers · **Priority** P0 · **Status** wireframed, update

## Job
Find upcoming seva and gatherings by date, place or type.

## Sections
1. Heading, plus a view switch: List (default on phone) · Month.
2. **Filters (new):** district, seva type, samithi, "Volunteers needed". Shown as chips, with a filter side sheet on phone.
3. List view: grouped by date. EventScheduleCard rows with time, title, samithi, district, seva icon and a "Volunteers needed" badge → Event.
4. Month view: dots per day; tapping a day lists its events.
5. Recurring gatherings (bhajans, study circles) shown lighter than one-off seva events.
6. "Get these on WhatsApp" opt-in explainer.

## States
- No results: "No seva matches these filters. Try another district or clear filters."
- Cancelled events: struck-through date and a "Cancelled" pill.

## Data
Only events with status Planned or later. Past events link to their results.

## Acceptance
- Every item links to Event.
- Filters persist in the URL.


---

# 10 · Event
**Route** `/events/[id]` · **Audience** public · **Priority** P0 · **Status** new

## Job
Before the event: tell people what, when and where, and invite help. After: show results.

## Sections, before the event (status Planned)
1. Breadcrumb: Home › Calendar › Event.
2. Title, seva type badge, status pill ("Planned"), date and time, duration.
3. Venue with address → Google Maps (external) and → Map. Samithi → Centre. District → District.
4. What happens: short description supplied by the coordinator (shown as entered).
5. Volunteers: "6 volunteers needed" plus a primary "Join this seva" button (opens the public form link).
6. What to bring or know (optional list).
7. Partner: e.g. "With ICARE Eye Hospital".
8. Contact: **centre contact only** (centre phone or WhatsApp number). Never a coordinator's personal number.

## Sections, after the event (status Approved)
1. Status pill "Approved", plus a results band of KPI tiles. For the sample: 115 screened · 63 spectacles · 13 cataract found.
2. Spectacles by power: small bar chart (+1.0 12, +1.5 10, +2.0 20, +2.5 14, +3.0 7).
3. Follow-up line for eye camps: "Cataract surgeries: 0 of 13 so far". Updates later.
4. Photos (no identifiable beneficiaries).
5. "Read the report" → Article, if one exists.

## Other states
- **Awaiting report or report submitted:** "Results will appear once the district approves them."
- **Cancelled or postponed:** banner with the new date if postponed.

## Acceptance
- Both before and after variants designed.
- No personal phone numbers.
- Results never shown before approval.


---

# 11 · Join a seva
**Route** `/join` · **Audience** public, would-be volunteers · **Priority** P1 · **Status** new (placeholder today)

## Job
Help someone pick an event and sign up, or opt in to hear about future seva.

## Sections
1. Hero: "Offer your hands".
2. Filter: district, seva type, date range.
3. Events needing volunteers (cards with the "Volunteers needed" count) → Event → public form link.
4. **"Tell me about future seva":** WhatsApp opt-in explainer. The visitor messages the bot "Join" from their phone. Show the number as text with a copy button, plus a QR code. No form collects data on this page.
5. What to expect as a sevadal: 3 short points.

## Privacy
Link to Privacy. Volunteers are counted, not profiled.

## Acceptance
No personal-data form on this page itself.


---

# 12 · Map (centre locator)
**Route** `/centres/map` · **Audience** public · **Priority** P1 · **Status** wireframed, update

## Job
Find the nearest centre.

## Sections
1. Search by pincode or locality, plus a "Use a district" select. (No geolocation; it isn't available in all contexts.)
2. Map with pins (desktop: map left, list right; phone: list first with a "Show map" toggle).
3. List rows: centre name, district, next gathering, distance if a pincode was entered → Centre.
4. Each row has a "Directions" → Google Maps (new tab).

## Acceptance
- Pins link to Centre.
- The list works without the map (accessibility).


---

# 13 · District
**Route** `/districts/[slug]` · **Audience** public · **Priority** P1 · **Status** new

## Job
Show one district's seva, centres and upcoming events.

## Sections
1. Breadcrumb: Home › About › Districts › East.
2. Hero: district name, number of samithis, short intro.
3. KPI tiles for this year (approved).
4. Breakdown by seva type (district level is where age and gender splits may appear, with under-5 suppression).
5. Upcoming events → Event.
6. Centres list → Centre.
7. "All districts" → Impact.

## Acceptance
Estimates labelled. Demographics only at this level or above.


---

# 14 · Centre / samithi
**Route** `/centres/[slug]` · **Audience** public, local members · **Priority** P0 · **Status** new

## Job
Everything about one local centre: when to come, what seva it runs, what it has achieved.

## Sections
1. Breadcrumb: Home › Centres › Mayur Vihar.
2. Name, district badge, address → Google Maps, centre contact (phone or WhatsApp as text with a copy button).
3. **Regular gatherings:** bhajan, study circle and Bal Vikas timings as a weekly schedule table.
4. Upcoming seva → Event.
5. **This year here:** samithi-level totals (no demographics).
6. Past events with results → Event.
7. Photos (optional slots).

## States
New centre with no data: hide the totals; show "This centre's seva will appear here."

## Acceptance
- Timings are editable in the portal (Centres) and display as a clean schedule.
- Contact is the centre's, not a person's.


---

# 15 · Discourses (feature flag `discourses`)
**Route** `/discourses` · **Audience** youth (16–30), public · **Priority** P2 · **Status** new

## Job
Let young people discover Swami's discourses on themes that matter to them, in Hindi and English.

## Sections
1. Hero: "Words for young people". Short intro, plus a credit line: "Published with permission of Sri Sathya Sai Sadhana Trust, Publications Division."
2. Theme chips:
   - Character, Education and purpose, Discipline, Ceiling on desires, Technology and distraction, Addiction and habits, Parents, Friendship, Self-confidence, Leadership, Service, Time, Career and ethics, Mental peace.
   - These are the 14 themes from the research.
3. Search.
4. Discourse cards: title (in the reading language), date, place, occasion, theme tags, one-line "why it matters" → Discourse.
5. Featured quote card (shareable).

## Acceptance
- Works fully in Hindi.
- The credit line is visible.
- Hidden when the flag is off: no nav item, and the route returns Not found.


---

# 16 · Discourse (feature flag `discourses`)
**Route** `/discourses/[slug]` · **Audience** youth, public · **Priority** P2 · **Status** new

## Job
Read one discourse comfortably and share a line from it.

## Sections
1. Breadcrumb.
2. Title, date, place, occasion, source (e.g. "Sathya Sai Speaks Vol 39, Ch 13"), theme tags.
3. Language switch: Hindi / English. Optional side-by-side on desktop.
4. Body: long-form reading layout (66ch, generous leading, section headings, pull quotes). Telugu poems set apart in italics.
5. **Quote cards:** 2–4 highlighted lines, each with a "Share as image" button that generates a card in the brand style.
6. Translation note: "Hindi translation reviewed by [reviewer group]. Report a correction" → Privacy contact or a feedback link.
7. Related discourses and the related Value page.

## Acceptance
- A comfortable reading measure.
- Quote cards follow the brand (QuoteCard, gold rule).
- Credit and source shown.


---

# 17 · Privacy and data requests
**Route** `/privacy` · **Audience** public, volunteers, beneficiaries · **Priority** P0 · **Status** new

## Job
Explain plainly what we collect and why (DPDP Act 2023), and let people ask to see, correct or delete their data.

## Sections
1. Summary in five plain bullets: we mostly store counts; we store a few personal details only for follow-up care with your consent; we never ask for ID numbers; you can ask us to delete your data; who to contact.
2. What we collect, by situation: attending a camp, cataract follow-up, joining as a volunteer, messaging our WhatsApp, visiting the website (cookieless analytics).
3. How long we keep it (retention table).
4. Your rights: access, correction, deletion, grievance.
5. **Make a request:** a form with name, phone, request type and details. Submit shows "We'll reply within 30 days." A consent tick-box is not needed here.
6. Data protection lead: role title and contact (name "to be appointed").
7. Version and date of this notice.

## Acceptance
- Readable at a 375px width.
- Hindi version complete.
- The request form has a clear success state.


---

# 18 · Not found and error
**Route** `/404`, `/500` · **Priority** P1

## Job
Recover gracefully.

## Content
- Not found: "We couldn't find that page." Links to Home, Calendar and Centres, plus search.
- Error: "Something went wrong on our side. Please try again in a few minutes."
- Moved from saidelhi.org: when an old URL has no match, show "This page moved when our site changed" with search.


---

# 19 · Form link: verify
**Route** `/f/[token]` · **Audience** the coordinator, a desk volunteer or a public sign-up who received a link · **Priority** P0

## Job
Confirm the link is valid and, for report links, that the person is allowed to use it, before showing the form.

## Layout
A minimal page: no site nav, just the emblem placeholder, language toggle and Sarva Dharma rule.

## Content
1. Event card: title, date, venue, samithi. Purpose label: "Report for this camp" / "Desk 2 entry" / "Join this seva".
2. **Report links:** "Enter your phone number" (prefilled mask), then "Send code on WhatsApp", then a 6-digit OTP field (auto-advance boxes) and "Verify". Include a "Resend in 30s" timer and a "Code not arriving?" help line.
3. **Desk links:** desk name shown ("Desk 2 – Mayur Vihar"); optional OTP depending on settings.
4. **Public links:** no OTP. Show a bot check and continue.

## States
- Wrong code (3 tries, then a 10-minute lock).
- Phone not on this event's list: "This link is for the event's coordinators. Ask your district coordinator to add your number."
- Offline: "You're offline. Connect once to verify; after that you can fill the form without signal."

## Acceptance
- Works at 375px with one thumb.
- No personal data in the URL.
- The token is never displayed.


---

# 20 · Form fill
**Route** `/f/[token]/form` · **Audience** coordinators and desk volunteers at or after a camp · **Priority** P0

## Job
Enter the event's data quickly and correctly on a phone, even with bad signal.

## Layout
- Minimal header: event title, language toggle, a save-status indicator ("Saved on this phone · Not sent yet" / "Sent").
- A sticky progress bar for multi-section forms.

## Content
Rendered from the event's locked form version. Design the **eye camp report** as the reference:
1. **Section "About the camp"**, the locked core fields:
   - Samithi (prefilled, read-only), date (prefilled), venue (prefilled, editable), partner hospital.
   - Volunteers (sevadals), volunteer hours.
2. **Section "People"**: registered/screened, male, female, under 18 (optional).
3. **Section "Spectacles"**: total given, then counts per power (+1.0, +1.5, +2.0, +2.5, +3.0, other). Live check: "Powers add up to 63 of 63" turns green.
4. **Section "Cataract"**: found, referred for surgery (≤ found), surgeries done (usually later; "Fill this when you know").
5. **Section "Attach"**: photo of the hospital register (optional, stored privately). The help text says it is never published and ID numbers are never read.
6. **Section "Follow-up list"** (optional repeater, personal data, only with consent): name, age, gender, phone, locality (colony or village only), consent yes/no. Visibly marked "Personal data". Add rows with "+ Add person".
7. Notes.
8. Review step: a summary of all answers, then "Send report".

## Field design
- Numeric keypad for numbers. Big steppers for small counts.
- Inline validation in both languages.
- Warnings (unusual numbers) are yellow and don't block. Errors are red and block.

## States
- Offline: "Saved on this phone. We'll send it when you're back online." Queue indicator.
- Session expired: re-verify by OTP without losing entered data.
- Already submitted: show the summary with "Edit report" (until approval).

## Acceptance
- Can be completed one-handed at 375px.
- Cross-field checks are visible.
- The personal-data section is clearly separated and needs consent.


---

# 21 · Form submitted
**Route** `/f/[token]/done` · **Priority** P0

## Content
- "Report sent. Thank you." Summary of key numbers.
- What happens next: "Your district coordinator will review it on WhatsApp. You'll get a message when it's approved."
- Buttons: "Edit report" (until approval) and "Close".
- For public sign-ups: "You're down for this seva. We'll remind you on WhatsApp the day before."


---

# 22 · Link expired or invalid
**Route** `/f/[token]` error states · **Priority** P0

## Variants
- **Expired:** "This link closed on 31 Oct 2026. Ask your samithi coordinator for a new one." Includes a "Message the bot" hint.
- **Revoked:** "This link is no longer active."
- **Used up:** "This link has already been used the maximum number of times."
- **Not found:** generic, without revealing whether a token exists.
- Event card shown only when it is safe to (expired and revoked show it; not found doesn't).


---

# 23 · Portal login (WhatsApp OTP)
**Route** `/admin/login` · **Audience** all portal roles · **Priority** P0

## Job
Sign in with a phone number and a code sent on WhatsApp.

## Content
1. Emblem placeholder, "Coordinator portal", language toggle.
2. Phone number field (+91 prefix), then "Send code on WhatsApp".
3. 6-digit OTP boxes, "Verify", "Resend in 30s".
4. Help: "Only registered coordinators can sign in. Ask your district coordinator to add you."
5. Fallback link: "WhatsApp not working? Get the code by email" (only for accounts with an email on file).

## States
- Unknown number (same neutral message as a known one, to avoid revealing who is registered).
- Too many attempts.
- Code expired.

## Acceptance
- No password field anywhere.
- No SaiConnect sign-in (it is only an external link on the public site).


---

# 24 · Overview
**Route** `/admin` · **Audience** samithi, district and state coordinators (scoped) · **Priority** P0 · **Wireframe first**

## Job
Tell me what needs me today, then how my area is doing.

## Admin shell (applies to all portal pages)
- **Left side navigation** with role-filtered groups: Operate, Collect, Organisation, Publish, Communicate, Govern. It collapses to a bottom tab bar plus a "More" sheet on phone.
- **Top bar:**
  - Scope switcher ("East district ▾" / "Samithi Mayur Vihar"; state admins can choose any).
  - Search, language toggle, profile menu (role shown), sign out.

## Sections
1. Greeting with scope, e.g. "East district · Monday 19 Oct".
2. **Needs you** (priority list, each row actionable):
   - Approvals waiting: "3 reports to approve" → Approvals.
   - Events awaiting a report: "2 camps without a report" → Events, filtered; inline "Resend link".
   - Inbox drafts: "4 WhatsApp messages to check" → Review inbox.
   - Escalations (state only): "1 approval escalated from North" → Approvals.
3. **KPI tiles for my scope this month:** activities, people served, volunteer hours, reporting rate (share of samithis that reported). Each has a sparkline and a vs-last-month delta.
4. **Upcoming events, next 14 days:** compact table (date, title, samithi, status pill) → Event detail.
5. **By seva type this month:** small bars.
6. Quick actions: "Plan an event", "Upload a file", "Copy a form link".

## States
- Nothing needs you: "You're all caught up."
- New coordinator with no data: onboarding checklist (add centre timings, plan first event).

## Acceptance
- On phone, "Needs you" is the first thing visible.
- The scope is always visible.
- Numbers match the scope.


---

# 25 · Events list
**Route** `/admin/events` · **Audience** coordinators (scoped) · **Priority** P0

## Job
See and manage every event in my scope across its lifecycle.

## Content
1. Tabs by status: All · Awaiting approval · Planned · Awaiting report · Report submitted · Approved · Escalated · Cancelled. Each tab shows a count.
2. Filters: date range, seva type, district, samithi, source (WhatsApp · Portal).
3. Data table: date, title, seva type icon, samithi, district, status pill, source icon, report due ("2 days overdue" in pink), last activity.
   - Row → Event detail.
   - Bulk: resend links, export.
4. "Plan an event" primary button → Plan event.

## Mobile
Cards instead of table rows, with the status pill and date prominent.

## Acceptance
Overdue reports stand out by text and colour.


---

# 26 · Event detail
**Route** `/admin/events/[id]` · **Audience** coordinators (scoped), state · **Priority** P0 · **Wireframe first. The hub of the portal.**

## Job
Everything about one event: where it is in its lifecycle, its form links, the data received and the approval trail.

## Sections
1. **Header:**
   - Title, seva type, date, venue, samithi, district, and a large status pill.
   - Primary action changes with status: "Approve plan" / "Send form links" / "Approve report" / "Request changes".
   - Overflow menu: edit, postpone, cancel, view public page.
2. **Lifecycle timeline** (horizontal stepper, vertical on phone): Draft → Awaiting approval → Planned → Event day → Awaiting report → Report submitted → Approved. Each step has a timestamp and who did it ("Approved on WhatsApp by District coordinator, 20 Oct 9:12 AM"). Escalation shown as a branch.
3. **Form links panel:**
   - One row per link: purpose (Report / Desk 2 / Public), who it went to, status (active · expires 31 Oct · 1 use of 1), last opened.
   - Actions: copy, resend on WhatsApp, show QR (Dialog with printable QR poster), extend, revoke.
   - "Add desk link".
4. **Submissions:**
   - The received report as a read-only summary of the form sections.
   - Source badge (Form · Upload · WhatsApp · Scan) and the submitter's verified phone (masked: +91 98•••••52).
   - Edit history.
5. **Results preview:** exactly what the public Event page will show after approval.
6. **Attachments:** register scan thumbnail, marked "Private · never published", with a retention note ("Deleted on 17 Oct 2027").
7. **Follow-up** (eye camps): count of people on the follow-up list → Follow-up (restricted; hidden for roles without access).
8. **Activity log:** every change, link use and message.

## States
- Before approval, links are disabled with the explanation "Links are sent once the district approves the plan".
- After approval, reports are read-only, with "Reopen for correction" (state only).

## Acceptance
- A coordinator can resend a link in two taps on phone.
- The QR poster is printable at A4.
- Masked phones only.


---

# 27 · Plan / edit event
**Route** `/admin/events/new`, `/admin/events/[id]/edit` · **Audience** samithi and district coordinators · **Priority** P0

## Job
The web version of the WhatsApp planning flow.

## Fields
- Seva type (select with icons).
- Title (auto-suggested, e.g. "Eye camp at Mayur Vihar").
- Date and time.
- Samithi (prefilled from scope), venue name and address, map pin (optional).
- Partner (select from Partners, or add new).
- Volunteers needed, what to bring.
- Public description (EN/HI; "Translate" helper that drafts the other language for review).
- Show on public calendar (on by default).

## Flow
Save as draft → Submit for district approval. Districts planning their own events can approve immediately, recorded as self-approved.

## Acceptance
- A preview of the public Event card sits beside the form on desktop and below it on phone.
- The bilingual description is required before submit.


---

# 28 · Review inbox
**Route** `/admin/inbox`, `/admin/inbox/[id]` · **Audience** district coordinators (first review), state data team (escalated or hard items) · **Priority** P0 · **Wireframe first**

## Job
Check data that didn't come through our forms (WhatsApp messages, raw Excel files, scans) after AI has drafted an entry, then approve, fix or reject it.

## List view
1. Tabs: For me · Escalated to state · Done.
2. Rows:
   - Source icon (WhatsApp / Excel / PDF scan), sender (masked), received time.
   - Matched event (or "No event matched"), AI confidence (High / Check / Low as text pills).
   - Age ("2 days").

## Item view (split screen)
1. **Left: the source.** The WhatsApp message thread, the sheet preview, or the scanned page with zoom and rotate. ID columns in scans are blurred by default with the note "ID numbers are not read or stored".
2. **Right: the draft entry.**
   - The form fields, filled by AI. Low-confidence fields are highlighted, each with a "Why?" hint ("Handwriting unclear").
   - Event match selector: link to an existing event or create one.
3. **Actions:**
   - Approve into event.
   - Save edits.
   - Send to state team (district only).
   - Reject with reason, which is messaged back to the sender on WhatsApp.
   - Ask sender, which sends a WhatsApp question.
4. Footer: "AI drafted this on 19 Oct. A person must approve it before it counts."

## Mobile
Source and draft as two tabs, not side by side.

## Acceptance
- Highlighting does not rely on colour alone (icon plus text).
- Scans show the ID blur.
- Every action names who did it.


---

# 29 · Approvals
**Route** `/admin/approvals` · **Audience** district coordinators, state admins (escalations) · **Priority** P0

## Job
A web fallback for approving plans and reports normally approved on WhatsApp.

## Content
1. Tabs: Plans · Reports · Escalated (state).
2. Cards: event, samithi, submitted by (masked), waiting time ("Escalates to state in 1 day"), key numbers for reports.
3. Inline actions: Approve · Request changes (reason) · Open event.
4. Bulk approve for plans only, not reports.

## Acceptance
- The countdown to escalation is visible.
- Approving here also updates the WhatsApp thread state.


---

# 30 · Form templates
**Route** `/admin/forms` · **Audience** state admins (publish), district coordinators (view, request change) · **Priority** P1

## Content
1. Grid or table of templates per seva type: name, current version ("v3 · published 2 Oct"), fields count, languages complete (EN ✓ HI ✓ as text), events using it.
2. Actions: Open builder, Duplicate, View versions, Preview, Download Excel template.
3. District view: "Request a change" opens a Dialog with a text box. Requests are listed for the state.
4. Change requests panel (state).


---

# 31 · Form builder
**Route** `/admin/forms/[id]/edit` · **Audience** state admins · **Priority** P1 (the pilot uses hand-written definitions) · **Wireframe first**

## Job
Let the state design and version event forms without a developer. One definition feeds the web form, the Excel template, the WhatsApp question sequence and validation.

## Layout (desktop-first; phone shows a read-only preview)
1. **Top bar:**
   - Template name, version badge ("Draft of v4").
   - Language completeness ("HI: 3 fields missing").
   - Preview (phone frame, EN/HI), "Test submission", Publish.
2. **Left palette:** Number, Text, Date, Time, Dropdown, Multi-select, Yes/No, Repeater group, Photo/file, Section heading, Help text.
3. **Centre canvas:**
   - Sections and fields in order, drag to reorder.
   - **Locked core fields** (samithi, date, venue, people served, volunteers, volunteer hours) carry a lock icon and can't be removed.
4. **Right settings panel** for the selected field:
   - Label EN and HI, help EN and HI.
   - Required; min/max.
   - Show-if rule ("Show when Spectacles given > 0").
   - Cross-field rule builder ("must be ≤ Cataract found").
   - Warning threshold.
   - **KPI mapping** select ("Maps to: spectacles_distributed" or "Custom, not in KPIs").
   - **Personal data** toggle. Turning it on forces a consent field and shows "Excluded from dashboards and exports".
   - Retention period.
5. **Bottom drawer tabs:** Excel preview (column headers) · WhatsApp preview (question sequence as chat bubbles) · Validation summary.

## Rules shown to the user
- Publishing creates a new version. Live links keep the version they were issued with.
- There is no field type for ID numbers.
- Removing a KPI-mapped field shows a warning Dialog.

## Acceptance
- Publish blocked until every field has EN and HI.
- Locked fields are visibly locked.
- The WhatsApp preview updates live.


---

# 32 · Form links
**Route** `/admin/links` · **Audience** coordinators (scoped), state · **Priority** P0 · **Wireframe first**

## Job
See and control every live form link.

## Content
1. Filters: status (Active · Expiring in 48h · Expired · Revoked), purpose (Report · Desk · Public), district, event.
2. Table:
   - Event, purpose, sent to (masked phone or "QR poster"), created, expires, uses (1/1, 14/∞).
   - Last opened, OTP required (yes/no text).
   - Row actions: copy, resend on WhatsApp, QR, extend, revoke.
3. Revoke confirmation Dialog: "Anyone with this link will see 'This link is no longer active'."
4. Expiring soon callout at the top.

## Acceptance
- Revoke and resend reachable on phone.
- Tokens are never shown, only "Copy link".


---

# 33 · Uploads
**Route** `/admin/uploads`, `/admin/uploads/new` · **Audience** samithi and district coordinators · **Priority** P1

## Upload flow (stepper)
1. **Choose seva type**, then "Download template" (prefilled with the samithi code), or upload your own file (goes to the Review inbox instead).
2. **Drop file** (Excel/CSV).
3. **Preview:** table with red cells and messages (EN/HI) and yellow warnings. "38 rows OK · 4 need fixing".
4. **Confirm:** "Load 38 rows". Option to "Download file with errors marked".
5. **Result:** "30 new, 8 updated, 4 rejected". Rows awaiting district approval.

## History view
Batches: file name, uploaded by, date, rows OK/updated/rejected, status. Download errors.

## Acceptance
- Re-uploading the same file says "No changes".
- Errors are understandable without technical words.


---

# 34 · Districts and samithis
**Route** `/admin/org` · **Audience** state admins (all), district coordinators (their samithis) · **Priority** P0

## Content
1. A tree view, Delhi NCR → districts → samithis, with counts. Select a node to edit.
2. Edit panel: name EN/HI, code (e.g. DL-E-MAYURVIHAR, read-only after creation), parent district, active from/to, linked centre.
3. Actions: add samithi, rename, merge (with a confirmation explaining history is kept), deactivate.

## Acceptance
- Codes are stable and visible (they appear in templates).
- Merge and deactivate never delete history.


---

# 35 · Centres
**Route** `/admin/centres`, `/admin/centres/[id]` · **Audience** district and samithi coordinators, content editors · **Priority** P1

## Job
Edit what the public Centre page shows.

## Content
- Public profile: name EN/HI, address, map pin picker, centre contact number (labelled "Shown publicly. Use the centre's number, not a personal one.").
- Weekly schedule editor: rows of day, time, gathering type (bhajan / study circle / Bal Vikas), language.
- Photos (with the rule reminder).
- A preview of the public page.


---

# 36 · Partners
**Route** `/admin/partners` · **Audience** state, districts · **Priority** P1

## Content
- Table: name (e.g. ICARE Eye Hospital), kind (hospital / blood bank / NGO / school), city, events this year, contact person (internal only).
- Add or edit Dialog.
- Shown publicly as "With [partner]" on Event and Program pages, by name only.


---

# 37 · People and access
**Route** `/admin/people` · **Audience** state admins (all), district coordinators (their samithi coordinators) · **Priority** P0

## Content
1. Table: name, masked phone, role, scope, last sign-in, status (Active / Invited / Deactivated).
2. **Invite:** name, phone, role, scope. Sends a WhatsApp invite.
3. **Edit role and scope:** role select, scope picker (tree).
4. **Access review** (quarterly banner): "Review 12 people who haven't signed in for 90 days".
5. Deactivate (immediate; signs the person out).

## Acceptance
- A district coordinator can only assign roles at or below their own, within their district.
- Office-bearer rotation is easy (deactivate plus invite).


---

# 38 · Content
**Route** `/admin/content`, `/admin/content/[id]` · **Audience** content editors (state media/IT team) · **Priority** P1

## List
Articles, News, Centenary, Home sections, Thought for the Day, Announcements. Columns: title, type, languages (EN ✓ HI —), status (Draft / Scheduled / Published), updated.

## Editor
- Title EN/HI tabs, body rich text (headings, quotes, images, lists), category, district tag, cover image.
- Link to an event, which inserts the results card.
- Schedule publish. Preview as the public page in either language.
- **"Create from event":** pre-fills a report article from an approved event's results.
- **Thought for the Day:** calendar of quotes with source.


---

# 39 · Discourses workspace (flag `discourses`)
**Route** `/admin/discourses`, `/admin/discourses/[id]` · **Audience** translators and reviewers (LTST), content editors · **Priority** P2

## List
The 87 shortlisted discourses (and more): title, source, themes, status (Not started · AI draft · In review · Approved · Published), assigned reviewer.

## Translation editor (split view)
- Left: English source (read-only, with paragraph numbers).
- Right: Hindi draft, paragraph-aligned and editable.
- Per-paragraph status: AI draft / edited / approved.
- Glossary panel (Atma, Dharma, Sathya, Prema, Shanti, Ahimsa, seva, sadhana, buddhi, viveka…) with fixed renderings. Glossary terms highlighted in the text.
- Quote card picker: select a sentence and "Make quote card", with a preview.
- Metadata: volume and chapter under both numberings, date, place, occasion, source URL, retrieval date.
- Workflow buttons: Request AI draft · Send for review · Approve · Publish (disabled while the flag is off: "Publishing opens once permission is granted").

## Acceptance
- Paragraph alignment visible.
- The publish gate is explained.


---

# 40 · Public impact controls
**Route** `/admin/impact` · **Audience** state admins, content editors · **Priority** P1

## Content
- Toggles for which KPIs appear on the public Impact page and Home tiles.
- Show/hide estimates; edit the estimate tooltip text.
- Rough historical estimates: a table of district × year × seva type, all labelled "Estimate", with source note and who entered them.
- A preview of the public tiles.


---

# 41 · Migration import
**Route** `/admin/migration` · **Audience** state admins · **Priority** P1 (one-off)

## Content
- Steps: connect source (upload saidelhi.org export or sitemap) → map content types (articles, centres, timings, pages) → preview → import → **redirects** table (old URL → new URL, status).
- Report: imported, skipped, needs manual fix.


---

# 42 · WhatsApp
**Route** `/admin/whatsapp` · **Audience** state admins (all), district coordinators (reminders) · **Priority** P1

## Tabs
1. **Message templates:** name, category (OTP / reminder / approval / broadcast), EN and HI text, Meta approval status (Approved / Pending / Rejected).
2. **Reminders:** rules ("Day before event", "Day after if no report", "+3 and +7 days, copy district"), each on/off.
3. **Broadcasts:** compose to opted-in volunteers by district or seva type, with an estimated message cost shown before sending ("About 240 messages").
4. **Conversation log:** searchable, masked numbers. Opens a thread view.
5. **Number status:** connected number, coexistence mode note, monthly message count and cost.

## Acceptance
- Cost is visible before any broadcast.
- Opt-in required for broadcasts.


---

# 43 · Volunteer sign-ups
**Route** `/admin/volunteers` · **Audience** coordinators (scoped) · **Priority** P1

## Content
- Per event: sign-up count against needed ("5 of 6"). Expand to see first names and masked phones, kept only until the event plus 30 days.
- Notify coordinator setting.
- No profiles, hours or history per person (counts only, by decision).


---

# 44 · Reports and exports
**Route** `/admin/reports` · **Audience** state, district · **Priority** P1

## Content
- **Monthly state report:** auto-generated on the 7th. View, download PDF, email list.
- **Custom export:** pick scope, period, seva types, fields. CSV.
  - Every export is logged and requires a reason ("For district meeting").
  - Personal data is never included.
- Scheduled reports list.


---

# 45 · Data health
**Route** `/admin/health` · **Audience** state admins, district coordinators · **Priority** P1

## Content
KPI tiles plus tables:
- Reporting rate by samithi (heatmap by month).
- Pending approvals by district, with age.
- Days from event to report.
- Upload success and rejected rows by reason.
- Channel mix (form / upload / WhatsApp / scan).
- Share of figures that are estimates.

Each problem row links to the place to fix it.


---

# 46 · Follow-up (restricted)
**Route** `/admin/follow-up` · **Audience** follow-up lead, PII officer · **Priority** P1

## Job
Track people who need care after a camp (cataract → surgery).

## Content
- Banner: "Personal data. Every view is logged."
- Table: name, age, gender, locality, phone (revealed on click, logged), camp, referred date, status (Referred · Surgery scheduled · Done · Declined · Unreachable), days waiting, consent ✓.
- Row actions: update status, add note, log call.
- Retention: "Removed 1 year after the surgery or last contact."
- Export disabled.

## Acceptance
- The phone is hidden until revealed.
- Consent is visible per row.
- No ID field.


---

# 47 · Privacy (restricted)
**Route** `/admin/privacy` · **Audience** PII officer, state admins (read) · **Priority** P1

## Tabs
1. **Requests:** from the public Privacy form. Type, received, due (30 days), status, assignee. Actions: find person's data, export for them, delete, reply.
2. **Consent records:** counts by form and purpose; withdrawals.
3. **Retention jobs:** upcoming deletions (register scans, follow-up records, volunteer sign-ups), last run.
4. **Breach log:** a "Start breach procedure" button opens a checklist with a 72-hour countdown.
5. Data protection lead: name (to be appointed), contact.


---

# 48 · Audit log
**Route** `/admin/audit` · **Audience** state admins, PII officer · **Priority** P1

## Content
An append-only table: time, who (role), action (approve, edit, export, view personal data, revoke link, publish), item, before/after (expandable). Filters and search. No edit or delete actions.


---

# 49 · Settings
**Route** `/admin/settings` · **Audience** state admins · **Priority** P1

## Tabs
- **Seva types:** name EN/HI, icon, wing, linked form template, public on/off.
- **KPI definitions:** name, formula description, public on/off.
- **Language strings:** UI text EN/HI with missing-translation filter.
- **Feature flags:** `discourses` (off: "Waiting for permission from the Sadhana Trust"), offline mode, AI extraction.
- **Link defaults:** report link expiry (+14 days), desk link (event day), OTP lock rules.
- **Escalation:** approval escalates after 3 days.
- **Analytics:** cookieless analytics status.


---

# 50 · WhatsApp bot conversations
**Channel** WhatsApp (existing organisation number; check coexistence) · **Audience** coordinators, district coordinators, public · **Priority** P0

## Job
Design the conversation flows as chat mockups: bubbles, quick-reply buttons and list messages. Bilingual: the user picks a language once, and it is remembered.

## Flows
1. **Main menu** (registered coordinator): Plan an activity · Report totals · My events · Help. District coordinators also see Approvals. Public numbers see: What's on near me · Join updates · Contact a centre.
2. **Plan an activity:**
   - Seva type (list) → date (quick replies: Today, Tomorrow, pick) → time → venue (free text) → volunteers needed (number) → partner (optional).
   - Then a summary card with Confirm / Edit, and "Sent to East district for approval".
3. **District approval:**
   - Message to the district: summary card with Approve / Reject / Ask.
   - Reject asks for a reason.
   - Day 2 reminder. Day 3: "This has been passed to the state team."
4. **Form links:** after approval, the coordinator gets the report link and the desk-link instructions. Day before: checklist. Day after: "How did the camp go? Report here."
5. **Report totals by chat:** the form's question sequence, one question per message with number validation and a final summary to confirm. A photo of the register can be attached ("Kept private. ID numbers are never read.").
6. **Report approval:** district gets the key numbers with Approve / Request changes.
7. **Login code:** "Your code is 482913. It expires in 5 minutes. Never share it."
8. **What's on near me:** ask for pincode or district, then up to 5 events with links.
9. **Errors:** unrecognised input, number out of range, session timeout ("Let's start again"), human handoff ("A coordinator will reply").

## Acceptance
- Every flow mocked in EN and HI.
- Message templates that need Meta approval are marked.
- No personal data requested beyond what the flow needs.
