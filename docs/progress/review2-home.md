# review2-home (caveman)

## done
- Contrast: `.act` in LotusJourney now has scrim (night glass 0.78 dark tone, cream glass 0.88 light tone, blur 10). Static/reduced-motion: no scrim. `--on-dark-soft` .8 -> .92.
  Worst-case ratios (backdrop white under dark scrim; dark sky under light scrim): eyebrow 5.73 / title 10.08 / body 8.83 (dark); eyebrow 5.11 / title 14.07 / body 5.99 (light). All >= 4.5.
- Rest of #home-flow audited in browser (EN 1280, HI 375, computed colours vs ancestor bg): 0 fails.
- Removed ImpactSnapshot + ProgramsTeaser + KPI css. HomePayload untouched.
- New order: lotus (5 values first) -> thought -> Bhajans (new) -> Learn (discourses flag on: 3 cards; off: Bhagawan intro -> /about + YouTube) -> upcoming -> news -> centenary -> stories -> finder -> wings -> auditorium -> involve.
- Bhajans: `src/features/home/data.ts` getUpcomingBhajans (events sevaType bhajan from today IST, 3), CTAs /programs/bhajan + /centres/map.
- Wings: WING_ICON 3 keys, css 3 cols, mahila/youth css+gloss strings gone, "three wings" en+hi. Render filters wings not in WING_ICON (safe until other track drops mahila/youth from server/services/home.ts).
- HI strings agent-written (bhajans*, learn*, disc*, wingsTitle) - needs native review.
- Checked: 375 + /hi no horizontal overflow; lint 0 errors; contract test pass.

## notes for lead
- typecheck: 2 errors in HomeSections (Record<Wing> + wingGloss key) until other track's Wing enum -> 3 values merges. Verified green with enum patched locally (reverted).
- Unused keys left in en/hi: home.impact*, programs*, answers* (some still used: answersWatch, answersPosterAlt).
- /programs/bhajan must exist (other track).
- Learn flag-on section hidden if flag on but 0 discourses (falls back to Bhagawan intro).
