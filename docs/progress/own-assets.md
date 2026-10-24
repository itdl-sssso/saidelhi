# Own brand assets

Done: transparent emblem PNG 512/1024 + white one-colour (approximate stencil, unused so far); icons (icon.png, apple-icon, 192/512, maskable) + `src/app/manifest.ts`; OG/Twitter images (root + events/news/discourses/values/programs/centres/districts, EN + HI, `src/lib/og`); nav/footer/form chrome use `emblem-512.png` (`EMBLEM_SRC`); PDF letterhead (`portal/letterhead.ts`, monthly report cover + QR poster); WhatsApp header 800x418 + profile 640 in `public/brand/whatsapp/`. Reproduce: `pnpm exec tsx scripts/gen-brand-assets.ts`.

Decisions
- Satori does not shape Devanagari: HI text in OG is rasterised via sharp/Pango with bundled Noto font files (`src/assets/fonts`, OFL), EN stays live text.
- `sharp` added as direct dep (lockfile edited by hand, offline mirror lacked metadata; already present transitively via next).
- Centenary "100" mark skipped: design export has only numeral over value emblem, no mark specified.
- Manifest single scope "/" (no separate /f manifest). No icon.svg (would require hand-tracing the emblem).
- No event-report PDF exists, only monthly report + QR poster.
- Dynamic OG with a news cover keeps the cover (explicit metadata overrides file convention).

Verified: typecheck/lint/test(369)/build green; OG en/hi/event rendered OK on :5400. e2e:perf not run.
