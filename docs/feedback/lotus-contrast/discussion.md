## Round 1 — Ideator

Rig: `node $D/mock.mjs <id> <css|-> [js|-]`, swiftshader WebGL works, real lotus renders (verified base bloom). Injection only. Metric = p5 per-pixel WCAG ratio behind text bbox (text hidden, halos/strokes kept, text-shadow kept). Min-pixel useless (petal outlines/stars give 1.0). Base: hero 10.4, firstlight 1.3 (1280)/2.0 (375), bloom 2.3, blessing 3.4/2.5. NOTE: firstlight (dark act) is ALSO broken in base: title crosses cream petals.
Insight: only cause = text sits dead centre on lotus heart. Fix = stop putting text on lotus. Every sky area is already lilac/cream = easy contrast. Precedent: stage already has `shift` (lotus offset in petal section), so offsetting lotus is existing idiom, not new.

### A `horizon` — lotus sinks, copy in sky above
- concept: translateY(26svh) lotus canvas+glow (only while data-focus=-1), copy top-anchored, one-line title on desktop. Ink colours darker on light acts.
- touches: CSS transform on `.gl`/`.glow` + `.pin` alignment + light-tone colours. NO stage.ts, no bloom timing. Canvas pixels identical, just moved.
- risk to bloom: low. bloom keeps full anim. Lotus centre lower, bottom petal more cropped. Mobile: lotus top at ~y450.
- shots: shots/horizon-{hero,firstlight,bloom,blessing}-{1280,375}.png
- p5 contrast: 10.4 / 5.1 / 4.4 / 9.5 (both widths). bloom 4.4 from lilac sky + gold eyebrow; darker eyebrow fixes.
- critique: very clean, all four acts fixed incl firstlight. Cost: lotus no longer hero-centred; hero silhouette sits low in dark (fine). Mobile text block ~290px leaves 150px dead gap before lotus.

### B `split` — editorial left column, lotus right (desktop); phone = horizon
- concept: text left-aligned 440px column, lotus translateX(22vw) scale .84 (origin bottom). Persistent across all 4 acts so zero jump.
- touches: CSS transform on lotus canvas, pin alignment, left-aligned copy. Desktop only. No stage.ts.
- risk: low-med. Lotus bleeds off right edge (right petal cropped) and rail dots sit near petal. Hero silhouette right of text = nice. Petal sections use stage `shift` to the right too, so composition continues into value petals (check hand-off transition, untested).
- shots: shots/split-*-1280.png, split-*-375.png (375 = horizon fallback)
- p5: 10.4 / 5.1 / 4.4 / 9.5.
- critique: best looking at 1280: feels like a real campaign page, lotus fully visible, big pink centre showcased. Min risk: left petal tip gets ~35px from body text; tighten column to 400px. 900–1100px widths need check (lotus may clip).

### C `ink` — CSS only typography
- concept: deep wine ink, weight 600/800, paper-coloured 9px outline (paint-order stroke) behind glyphs; plum outline on dark act.
- touches: CSS colours/stroke only. Zero layout/canvas change.
- risk to bloom: none.
- shots: shots/ink-*.png
- p5 (halo counted): hero 10.4, firstlight 1.0 (gold eyebrow crosses petals, unfixed), bloom 5.9/4.4, blessing 7.5/4.6.
- critique: legible but looks sticker / meme-caption. Same family as rejected glass edge: visible halo. Firstlight outline looks cheap. Keep only as fallback or the colour tweaks (darker ink) which are free.

### D `lowerthird` — per-act placement
- concept: act1 above bud, acts 2-3 bottom-left caption on sky. phone horizon.
- touches: CSS positioning only.
- shots: shots/lowerthird-*.png
- p5 (old ink measure, colours not darkened): 10.4 / 5.1 / 2.3 / 4.7.
- critique: weak. At 1280x800 the left petal and bottom petal crowd the bottom-left corner; title top edge touches petal. Caption feel is nice but corner too small. Superseded by B. Drop.

### E `defocus` — canvas blur after bloom
- concept: filter blur(9px) saturate .8, opacity .55 on lotus in acts 2-3; darker ink.
- touches: CSS filter on lotus canvas. Changes how bloom LOOKS (not its motion).
- risk: HIGH. User said don't tamper with bloom; this turns the showpiece into mush, and filter on full-viewport WebGL canvas costs GPU on phones.
- shots: shots/defocus-*.png
- p5: 10.4 / 1.3 / 3.8 / 5.2 (375: 2.0 / 2.7 / 3.9). Still under 4.5 in places even blurred.
- critique: readable but blurry lotus = loses the point. Reject; listed for completeness.

### F `sunrise` — lotus rises from bottom edge, huge type above
- concept: translateY(38svh) lotus, title up to 72px one line, centred.
- touches: CSS transform + pin + type size. No stage.ts.
- risk: med. Bloom centre (pink core) partly below fold at 1280x800; upper two thirds visible. Full bloom reveal reads as "lotus rising from water" which is thematically good, but the stamens/centre are the most beautiful part.
- shots: shots/sunrise-*.png
- p5: 10.4 / 5.1 / 4.4 / 9.5.
- critique: bold, hero-like typography, strongest "headline" feel. Loses centre of lotus on short viewports (1366x650 laptops worse).

### Ranking so far
1. B split (desktop) + A horizon (phone) as one responsive system. Biggest contrast win with no bloom-motion change; only moves canvas via transform, same idiom as existing `shift`.
2. A horizon everywhere (simplest, one rule set, works at every aspect).
Free add-on to any: darker ink on light acts (#1a1020 title, #2a1a26 body, #5a3200 eyebrow) lifts bloom text from 2.3 to ~4.4+ by itself.
Open issues: eyebrow colour still <4.5 on lilac (use #4a2800); canvas scaling exposes canvas crop edge (use origin bottom or translate-only); not tested: 900-1100px, /hi (longer Devanagari lines), prefers-reduced-motion, transition into petal sections (focus>=0 reverts transform with 900ms ease; needs eye check), real GPU perf.

## Round 1 — Challenger

Rig ext: `mock2.mjs` = mock.mjs + env `SIZES=1024x768,900x700 ACTS=hero,bloom PATHN=/hi TAG=-hi`. Same metric. mock.mjs untouched.

### Metric attack
Ideator's p5 for horizon/split/sunrise are IDENTICAL to 2 dp (10.43/5.07/4.36/9.49), identical at 1280 AND 375, and split at 1024/900 returns the same 4.36 again. Number cannot see layout: it samples near-flat sky. Treat as "text sits on sky", not a comparative score. By eye, base bloom with dark ink already reads (title #111 on cream = fine); real weak spots are only (a) body line over pink/stamens, (b) firstlight cream-on-cream. Metric also shows base hero 10.4 = hero never needed fixing, yet A/B/F all move the hero.

### Critique of Ideator ideas
- **B split: FIX or KILL.** Real bug: at 1024 and 900 the translated canvas left edge is VISIBLE as a hard vertical cut through the left petal (x=307 @1024, x=270 @900; shots/split-bloom-1024.png, split-bloom-900.png). Cause: canvas box moves 22vw, petals wider than box at narrow aspect. 1280 happens to fit. Also rail dots touch right petal; hero silhouette moves away from centre = loses the one centred "title on dark lotus" moment. Hindi 1280 OK (shots/split-hi-bloom-1280.png, body wraps 2 lines, ends 40px from petal tip). To keep: use stage `shift` (camera translateX, JourneyStage.tsx:108 one expr) not CSS translate = no edge. But that edits the stage call = "touching bloom" to this user; moving the flower off-centre is the biggest visible change of all options.
- **A horizon: KEEP as phone-only fallback.** Translate-only so no edge artefact at bottom. 150px dead gap on phone noted by Ideator is real (horizon-bloom-375). Hero should be exempt (focus -1 includes hero? Ideator applies at data-focus=-1 = all 4 acts incl hero; hero is fine at 10.4, don't move it).
- **C ink: KEEP colour part only** (free). Outline: KILL, agree.
- **D lowerthird: KILL**, agree; but see footing below which fixes the idea (placed on bottom petal, not corner).
- **E defocus: KILL**.
- **F sunrise: KILL**, agree (centre below fold).
- Missed: firstlight is the cheapest fix (text just needs to leave the bud) and none of A-F isolates it. Missed: scale of canvas (plinth) exposes canvas crop edges on phone (see below).

### New ideas (all CSS-only, page injection)
**G `quiet`** (ideas/quiet.css) — hero untouched; firstlight copy slides 31svh down to sit under the bud; light acts get deep ink (#1a1020 / #2a1a26 w500 / #4a2800 eyebrow). Touches: `.act[data-index=1]` transform + colours. Canvas: ZERO. Risk to bloom: none. Shots: shots/quiet-{hero,firstlight,bloom,blessing}-{1280,375}.png. p5: 10.4 / 4.7 / 5.0 / 7.5 (375: 4.7 / 5.0 / 5.2). Verdict by eye: firstlight is now a clean bud hero-shot; bloom text still crosses pink core+stamens but dark ink reads. This is the "do the least" baseline everything else must beat.
**H `plinth`** (ideas/plinth.css) — acts 1-3 only: canvas+glow scale .64 about bottom-centre, copy centred above in sky, hero untouched. Touches: transform scale on .gl/.glow, pin padding, ink. Risk: lotus shrinks to ~700px wide (smaller showpiece, whole flower visible, centre above fold). Phone BUG: scale .8 exposes canvas crop edges (hard straight cuts at x=37 and x=337, shots/plinth-bloom-375.png) so scaling is desktop-only. Shots plinth-*-{1280,375}.png. p5 10.4 / 5.1 / 5.2 / 11.3. Desktop looks good and premium; costs lotus scale.
**I `footing`** (ideas/footing.css) — CSS-only, canvas untouched: hero centred; firstlight under bud; bloom/blessing desktop: copy drops 31svh onto the big cream bottom petal, one-line title (max 48px); phone: copy rises 27svh into sky/top petal tips. Deep ink. Touches: act transforms, title size, colours. Risk to bloom: none (lotus centre, stamens now fully unobstructed = the showpiece moment). Shots footing-*-{1280,375}.png. p5 10.4 / 4.7 / 6.5 / 6.2 (375: 4.7 / 5.2 / 6.7). Weakness: title still crosses a thin strip of the lowest pink petals at 1280x800 (x490-750); 375 lede grazes petal tips; short viewports (1366x650) untested.
**J `splitcam`** (NOT mocked; needs stage call change) — split but via stage `shift` (camera) so no canvas edge, only act>=1, hero stays centred. Honest: modifies JourneyStage.tsx:108, changes lotus composition for 3 acts. Only worth it if user wants editorial split.
**K rejected by reasoning:** text-behind-lotus (petals occlude copy), idle fade-out of text (a11y), canvas-level dark sky in bloom (pale text on cream petals gets worse), full-bleed horizontal band (= scrim).

### My top 2
1. **I footing** (+ G's firstlight fix): zero canvas change, centre of flower never covered, hero kept.
2. **H plinth desktop + A horizon phone**, if user insists on sky-only text. Not split (edge bug).

### Questions for Ideator
1. Why do your p5 numbers not change between split/horizon/sunrise or between 1280/375/1024/900? Show a metric that moves when a layout is worse.
2. Does your own claim "no stage.ts, no bloom change" hold for a user who will see the lotus slide sideways/down/shrink on scroll? Isn't a moved lotus more visible than darker ink?
3. Fix split's visible canvas edge at <=1100px without stage.ts, or drop it? And why move the hero act, which scores 10.4 untouched?

## Round 2 — Ideator

Rig: `mock3.mjs <id> <css>` (env SIZES, ACTS, PATHN, TAG). Shots `shots/<id>[-hi]-<act>-<w>.png`. Results `results3.jsonl`, `run3.log`.

### Metric (answer Q1)
Challenger right: old p5 sampled whole text bbox = mostly sky, so same number for any layout. New metric uses GLYPH pixels only (fg shot vs text-hidden shot, mask = pixels near text colour that differ from bg), per pixel WCAG vs real bg. Reports: `fail%` = % glyph px below threshold (4.5 body, 3.0 text >=24px), `p5` ratio, `sd` = luminance std-dev of bg behind glyphs (busyness: 0 = flat sky, ~0.19 = text on petals).
Base (1280 / 375), acts firstlight | bloom | blessing:
- fail%: 14.1 | 8.8 | 6.1  /  18.1 | 16.1 | 21.2
- p5: 2.1 | 3.0 | 4.2  /  1.9 | 2.9 | 2.9
- sd: .12 | .19 | .18  /  .14 | .19 | .19
Finding: dark ink alone (`quiet`) drops fail% to ~0-0.8 and p5 to 4.8-7.7, BUT sd stays .19 = text still over busy petals. Fail% says "legal", sd says "calm". Layouts differ on sd:
| id (1280 bloom) | fail% | p5 | sd | 375 bloom sd |
| quiet (ink + firstlight drop) | 0.8 | 5.9 | .194 | .187 |
| footing (31svh) | 1.1 | 6.3 | .173 | .078 |
| footing2 (38svh) | 0.2 | 6.5 | .147 | .078 |
| plinth (old, scale) | 0 | 6.2 | .026 | .043 |
| plinthhz | 0 | 6.5 | .003 | 0 |
| split2 | 0 | 6.5 | .004 | .006 |
| horizon old | 2.1 | 6.5 | .003 | .011 |
| split old | 2.8 | 6.5 | .006 | .001 |
(fail% on old horizon/split came from darker-ink gaps + stray falling petals; refined versions 0.) Hero not re-measured: untouched in new candidates, base 10.4.

### Answers
Q1: done above. Honest summary: contrast ratio is solved by ink alone; the remaining question is "text on busy petals vs text on sky", which only sd shows.
Q2: No. "No stage.ts" is true but a lotus that slides/shrinks on scroll IS more visible than ink. Concede: plinth/split/horizon change the bloom composition the user watches; footing/quiet do not touch canvas at all. Only the user can say whether a moved lotus counts as "tampering"; I will not claim it is neutral.
Q3: split edge cause = lotus is wider than canvas box when aspect <~1.5 (crop was always at viewport edge, translate exposes it). Not fixable without stage/camera. Fix: split only at `min-aspect-ratio:3/2 and min-width:1180px` (1280x800 and wider fits, checked 1280); below that, translate-only horizon (translate never exposes side edges, verified 1024 and 375, no cut). Same fix for plinth (it had the same edge bug at 1024, gated now) and gating by `data-focus=-1` (old plinth/footing leaked scale into petal sections: data-act stays 3 there). Hero: concede, refined candidates leave hero untouched (it scored 10.4).

### Refined candidates (all CSS injection, hero untouched, light-act ink #1a1020/#2a1a26 w500/#4a2800)
1. `footing2` (ideas/footing2.css) — CSS only. firstlight copy 31svh down under bud; bloom/blessing desktop copy 38svh down onto bottom petal, one-line title; phone copy 27svh up into sky. Touches: act transforms, title size, colours. Canvas ZERO. Risk to bloom: none. Shots: footing2-{hero,firstlight,bloom,blessing}-{1280,1024,375}.png, footing2-hi-{bloom,blessing}-1280.png. fail% 0-0.2, p5 6.5/9.6, sd .147 (1280), .141 (1024), .078 (375). Critique: eyebrow still grazes pink petal tips at 1280 (/hi), phone eyebrow close to nav, body grazes right petal tip. Safest.
2. `plinthhz` (ideas/plinthhz.css) — acts1-3 only, focus=-1 gated. Wide (aspect>=3/2, w>=1180): lotus scale .66 about bottom-centre, text above in sky. Else translateY(24svh) horizon. Touches: canvas transform. Risk: shrinks/moves showpiece; whole flower visible. Shots plinthhz-*-{1280,1024,375}, plinthhz-hi-*. fail% 0, p5 6.5/14, sd .003-.015. Critique: cleanest legibility; most visible change; lotus 700px wide at 1280.
3. `split2` (ideas/split2.css) — same gate, wide: left text column, lotus right (translateX 21vw, scale .84); else horizon. Shots split2-*-{1280,1024,375}, split2-hi-*. fail% 0, p5 6.5/14, sd .004. Critique: best-looking at 1280 (campaign look), Hindi fine (2 lines title + 2 body, 35px from petal); 1024 = horizon fallback, no cut. Rail dots touch right petal. Most visible change; stat 1366x768 and 1920x1080 untested for the cut (gate assumes aspect>=1.5 is safe).
Not mocked: no 4th.

### Concede
Kill: lowerthird (D), defocus (E), sunrise (F), ink outline (C halo), old `split`/old `horizon` (as all-width, all-act versions). Ink colours = free, take them. Concede Challenger's point that hero should not move and firstlight needed its own fix (copy drops 31svh).

### Top pick
Recommend `footing2` as the proposal: zero canvas change, centre of flower unobstructed, hero kept, passes WCAG (fail 0.2%). Tradeoff stated honestly: sd .15 = text still sits on pale cream petal at desktop; if the user wants text on pure sky and accepts the lotus moving, `plinthhz` (safer than split2, shows whole bloom) is the alternative, `split2` only if they want editorial. Suggest showing user footing2 vs plinthhz.

## Round 2 — Challenger + shortlist

### Rebuttals
- Metric: accept glyph-only fail%/sd. Contrast is solved by ink alone; sd is the real discriminator.
- footing2 grazing: accept critique, try fix. **footing3** (ideas/footing3.css): desktop shift 41svh (was 38), title max 44px, body 16px, eyebrow margin 6px; phone shift -29svh, body 15px. Eyebrow no longer touches pink tips. Measured fail% / p5 / sd (bloom): 1280 0.1/6.47/.119, 1366 0.2/6.47/.119, 1920 0.1/7.24/.107, 375 0.2/5.17/.029. Blessing sd .09/.10/.06, 375 0. Firstlight sd .002 everywhere. (footing2 bloom sd was .147.)
  Honest downside left: at 1280x800 and 1366x768 copy hugs the bottom edge (body ends ~y796), title still crosses the petal/sky boundary (sd .12 ≠ calm). Cannot get lower without clipping. Not a 3rd fix away; it is a ceiling of "text stays on the flower".
- plinthhz / split2: accept at 1366x768 and 1920x1080: bloom fail 0, sd ≤.003 (no cut seen in metric; sheets at 1280 clean). Ideator's gate holds. Kept both as the "sky-only" alternatives.
- Kill (agreed): lowerthird, defocus, sunrise, ink outline, old split/horizon, splitcam (needs stage).

### SHORTLIST (max 3). Sheets: final/<id>-sheet.png (acts firstlight/bloom/blessing × 1280/375); base: final/base-sheet.png
| id | touches | risk to bloom anim | numbers (bloom 1280 / 375) | honest downside |
|---|---|---|---|---|
| **footing3** | act transforms, type size, ink; canvas ZERO | none | fail .1/.2, p5 6.47/5.17, sd .119/.029 (1366 .119, 1920 .107) | text still over petal edges on desktop, hugs bottom edge at 800px tall; phone copy crowds nav |
| **plinthhz** | canvas+glow transform (scale .66 wide / translateY 24svh narrow), pin, ink | visible: lotus shrinks (~700px at 1280) / drops on scroll; bloom motion code untouched | fail 0/0, p5 6.47, sd .003/.003 (1366, 1920 same) | most-seen change to showpiece; user may call it tampering |
| **split2** | same + left column, gated aspect>=1.5 & w>=1180; else horizon | visible: lotus slides right+shrinks | fail 0, p5 6.47, sd .004/.006 | biggest change; rail dots touch petal; 900-1180 uses horizon fallback; hero position dependent |
Base for reference (bloom 1280/375): fail 8.8/16.1, p5 3.0/2.9, sd .19/.19.

### Views
- Ideator: footing3/2 first pick (safest), plinthhz alternative, split2 only for editorial.
- Challenger: same first pick, footing3 (+quiet firstlight drop). If user rejects any lotus-adjacent text, plinthhz second. split2 third: prettiest, most intrusive. Recommend showing user footing3 vs plinthhz side by side; both are CSS-only injections, reversible.
