# Sri Sathya Sai Seva Organisation (SSSSO) — Delhi NCR Design System

A design system for the public digital presence of the Sri Sathya Sai Seva Organisation in the Delhi National Capital Region: a volunteer service body whose activities (bhajans, study circles, Bal Vikas classes, medical camps, food and environmental seva) are free and open to people of every faith.

## Sources used

**No codebase, Figma file, brand kit, logo file, or existing screenshots were provided.** This system was authored entirely from a written brief supplied in chat, which specified:

- The "Prashanti Nilayam palette" — Prashanti Pink `#F7CAC9`/`#F4C2C2` (Prem), Prashanti Blue `#AEC6CF`/`#92A8D1` (Shanti), Ashram Yellow `#FDFD96`/`#FCE883` (Sathya), white `#FFFFFF` and cream `#FAFAFA`, slate `#1F2937` for text.
- A dignified serif for headings (Playfair Display or Merriweather) paired with a readable sans for body (Inter or Roboto).
- Required surfaces: header/navigation with a Sarva Dharma logo placeholder, a design-tokens panel, type and button specimens, and three contextual cards (Thought for the Day, Seva Activities, Upcoming Bhajans/Events).

Everything not named in that brief — the ramps, semantic aliases, spacing, elevation, motion, component APIs and page copy — is an original extrapolation, not organisation-sanctioned material. **Replace the copy and confirm the colours with the organisation before public use.**

### Known gaps — please supply

1. **The Sarva Dharma emblem.** No logo file was given, so nothing has been drawn. `NavBar` renders a dashed placeholder ring where the mark belongs. Send the official SVG/PNG and it drops straight in.
2. **Font binaries.** None supplied. Playfair Display and Inter load from the Google Fonts CDN (`tokens/fonts.css`). Send licensed binaries if self-hosting is required.
3. **Photography.** No imagery was supplied, so no image assets exist in `assets/` and no placeholder photography has been invented. Layouts are typographic and colour-led.

---

## Content fundamentals

**Voice.** Warm, plain, unhurried. The organisation speaks as a group of neighbours, not an institution. Sentences are short and declarative. No urgency, no marketing pressure, no exclamation marks.

**Person.** "We" for the organisation, "you" for the reader. Never "users" or "customers" — the words are *sevadals*, *members*, *devotees*, *visitors*, *children*.

**Casing.** Sentence case everywhere — headings, buttons, labels. Title Case only for proper nouns and named practices: Bal Vikas, Nagar Sankirtan, Narayana Seva, Sarva Dharma, Thought for the Day.

**Sanskrit terms.** Used freely but always glossed on first appearance in a section: "seva (service)", "bhajan (devotional singing)". Never italicised — they are ordinary words here.

**Numbers.** Spelled out under ten in prose; numerals for times, dates and counts. Times use "5:30 PM", dates use "14 August 2026" or the "14 Aug" chip.

**Emoji.** Never. Not in headings, buttons, cards, or metadata. Iconography carries that job.

**Examples of the register:**

- Heading: "Love all, serve all." / "Service is worship in action" / "Offer your hands"
- Body: "Bhajans, study circles, Bal Vikas classes and service in eight districts — open to everyone, free always. Come as you are."
- Button: "Join a seva" · "Find your centre" · "Register to attend" · "Send"
- Disclaimer: "All activities are free and open to people of every faith. Nothing is ever collected from the public."
- **Avoid:** "Unlock your spiritual journey", "Sign up now!", "Don't miss out", "Our mission is to leverage…"

---

## Visual foundations

**Colour.** Three named values plus neutrals. Pink is the action colour (Prem), blue the informational and structural colour (Shanti), yellow strictly a highlight (Sathya) — yellow is never a background for a whole section and never carries text at its light end. Backgrounds are cream `#FAFAFA` for pages, white for cards, and at most **two** tinted section backgrounds per page (usually one blue, one white). Text is slate `#1F2937`; pure black is never used. The single dark surface in the system is the footer, `--blue-700` `#31415B`.

**Type.** Playfair Display for every heading — regular weight (400) at display sizes, medium (500) at H4, italic only inside quotations. Inter for all body, labels, buttons and metadata, 300–600. Headings never go bold-heavy; the serif carries the dignity, not the weight. Scale: 44 / 32 / 24 / 20 headings, 19 lead, 17 body, 15 small, 13 caption. Body leading is 1.65, heading leading 1.25, display tracking −0.02em, eyebrow tracking +0.16em uppercase.

**Backgrounds.** Flat colour and one permitted gradient: a top-to-bottom `--blue-50 → --cream` wash behind the hero. The Sarva Dharma rule itself is a solid gold hairline, not a gradient. No photographic full-bleeds are specified (none supplied), no repeating patterns, no textures, no noise, no mesh gradients. The only decorative graphic is the **Sarva Dharma rule** — a five-stop horizontal gradient hairline (pink → yellow → blue → blue → pink) used at 2px under the header, 3px above the footer, and 6px as a card or dialog cap. Never wider, never as a fill.

**Cards.** 16px radius (`--radius-lg`), 1px hairline border in either `--border-subtle` or the tone's own border, 24px padding, `--shadow-sm`. Four tones: plain white, calm blue, warm pink, truth yellow. Clickable cards lift 2px and deepen to `--shadow-lg` on hover. No coloured left-border accent cards.

**Elevation.** Whisper-soft only — the largest shadow in the system is `0 12px 32px rgba(31,41,55,.09)`. Two coloured glows (`--shadow-glow-warm`, `--shadow-glow-calm`) appear on primary/secondary button hover and nowhere else. No inner shadows except the header hairline.

**Radii.** 6 sm (checkboxes, chips), 10 md (inputs, date chips, alerts), 16 lg (cards), 24 xl (large panels), pill (every button, badge, tab and nav link). Buttons are *always* fully pill-shaped.

**Borders.** 1px, never 2px. Tinted borders always pair with their tinted surface (`--surface-calm` + `--border-calm`).

**Transparency & blur.** Exactly two places: the sticky header (`rgba(255,255,255,.88)` + `saturate(1.1) blur(12px)`) and the dialog scrim (`rgba(31,41,55,.28)` + 3px blur). Nothing else is translucent.

**Animation.** `--ease-serene` `cubic-bezier(.22,.61,.36,1)` — a calm decelerating curve. Durations 160ms (colour), 240ms (shadow, transform, toggles), 400ms (entrances). No bounce, no spring, no overshoot, no autoplaying motion. All durations collapse to 0 under `prefers-reduced-motion`.

**Hover.** Buttons move one step warmer/darker in their ramp and gain their coloured glow; cards lift −2px; nav links fill with `--pink-100`; ghost links deepen from `--blue-600` to `--blue-700`. Never opacity-fades.

**Press.** `scale(.985)` — a slight settle, no colour flash.

**Focus.** `0 0 0 3px rgba(91,118,163,.35)` ring plus a `--blue-500` border. Always visible; never removed.

**Layout.** 1200px max container, 40px desktop gutters (20px mobile), 96px section padding (64px below 768px), prose capped at 66 characters. The header is the only fixed element. Grids are 3-up for seva, 4-up for tokens, 2-up for split sections.

**Accessibility.** Because the palette is pastel, colour never carries meaning alone — every tinted surface pairs with a dark text token from the same family, and every pairing in `guidelines/colors-contrast.html` clears 4.5:1. Interactive targets are ≥44px.

**Imagery vibe (for whenever photography arrives).** Warm daylight, unposed, people mid-action rather than posing; no heavy filters, no black-and-white, no grain. People over buildings; hands and faces over crowds.

---

## Iconography

**System: [Lucide](https://lucide.dev), loaded from CDN** (`https://unpkg.com/lucide@0.454.0/dist/umd/lucide.js`). ⚠️ **This is a substitution** — no icon set was supplied with the brief, and the brief itself asked for `lucide-react`. Lucide's thin, rounded, open-stroke line style is the closest match to the system's serene register. If the organisation has its own glyph set, send it and this is a one-file swap.

- Always via the `Icon` component: `<Icon name="hand-heart" size={18} />`.
- Stroke weight is **1.75** everywhere; sizes are **16, 18, 20, 24** only.
- Always `currentColor` — icons inherit their container's text colour, never carry their own.
- **No emoji, ever.** No unicode symbols used as icons (no ✓ ★ →) — arrows and checks are Lucide glyphs.
- No hand-drawn SVG. Nothing in this system draws a custom path except the Sarva Dharma rule, which is a solid CSS colour bar, not artwork.
- Recurring glyph vocabulary: `hand-heart` (seva), `music` (bhajan), `book-open` (study circle), `graduation-cap` (Bal Vikas), `stethoscope` (medical), `droplets` (water), `sprout` (environment), `heart-handshake` (youth), `calendar-days`, `clock`, `map-pin`, `users`, `sun`, `quote`, `arrow-right`, `search`.

`assets/` is currently empty by design: no logos, illustrations or photographs were provided, and none have been invented.

---

## Index

| Path | What it is |
|---|---|
| `styles.css` | Root entry — `@import` list only. Consumers link this one file. |
| `tokens/fonts.css` | Google Fonts import for Playfair Display + Inter |
| `tokens/colors.css` | Ramps, semantic surfaces/text/borders, signals, dharma ramp |
| `tokens/typography.css` | Families, sizes, leading, tracking, weights, measures |
| `tokens/spacing.css` | 4px scale, radii, containers, gutters |
| `tokens/elevation.css` | Shadows, focus ring, scrim, blur |
| `tokens/motion.css` | Easing, durations, hover lift, press scale |
| `guidelines/*.html` | 18 foundation specimen cards (Colors, Type, Spacing, Brand) |
| `components/**` | React primitives + `.d.ts` + `.prompt.md` + one `@dsCard` per directory |
| `ui_kits/website/` | Interactive recreation of the public site |
| `thumbnail.html` | Homepage tile for this design system |
| `SKILL.md` | Agent Skills front-matter for use in Claude Code |

### Components

**Core** — `Button`, `Badge`, `Eyebrow`, `DharmaRule`, `Icon`
**Forms** — `Input`, `Select`, `Checkbox`, `Switch`
**Surfaces** — `Card`, `SectionHeading`, `ColorToken`
**Content** — `QuoteCard`, `SevaCard`, `EventScheduleCard`
**Navigation** — `NavBar`, `Tabs`
**Feedback** — `Alert`, `Dialog`

#### Intentional additions

No source defined a component inventory, so this is an authored standard set sized to the brief's requirements. Beyond the brief's explicit asks:

- `Icon` — a wrapper so no surface ever hand-rolls SVG.
- `DharmaRule` — the brief's "subtle accent line", promoted to a component so it stays consistent.
- `Eyebrow`, `SectionHeading`, `ColorToken` — layout primitives the tokens panel and page sections all needed.
- `Tabs`, `Alert`, `Dialog`, and the form family — needed for the UI kit to be a working site rather than a storybook.

### UI kits

- `ui_kits/website/` — public homepage: sticky header, hero with Thought for the Day, design-tokens panel, filterable seva grid, events calendar, volunteer form, inverse footer. Interactive: nav, seva filters, seva detail modal, registration modal.
