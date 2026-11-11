# SEO & AI-search baseline

Reference point for every SEO / AI-search improvement on the rebuilt site. Moved here from the legacy repo (`saidelhi org/seo/`) on 11 Nov 2026 so new runs sit next to the code they measure.

## Baseline: legacy saidelhi.org, live, 21 Oct 2026

Overall **28 / 100** across 68 crawled pages. Full detail: [scorecard.md](snapshots/2026-10-21-legacy-live/scorecard.md).

| Area | Score | Weakest checks |
|---|---|---|
| SEO | **10** | no meta descriptions, no canonical, no single `<h1>`, no OG tags, robots.txt + sitemap.xml 404, www not redirected, favicon 404, 18% unique titles |
| Performance | **35** | worst LCP 16.8 s, heaviest page 9.3 MB |
| AI | **39** | no Organization / Article / Event JSON-LD (0/53 posts), no llms.txt, no hreflang, robots.txt names no AI crawlers |

What was already fine: all six crawlers tested (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Googlebot, Bingbot) got full HTML, image alt text 98%, visible publish dates, and contact facts (PIN, phone, email) in page text.

Lighthouse (mobile), 21 Oct 2026:

| URL | Perf | A11y | Best practices | SEO |
|---|---|---|---|---|
| `/` | 55 | 84 | 75 | 82 |
| `/about-us/` | 64 | 89 | 89 | 91 |

## Other snapshots

| Snapshot | What | Overall |
|---|---|---|
| [2026-10-21-legacy-live](snapshots/2026-10-21-legacy-live/scorecard.md) | **The baseline.** Live legacy Django site | 28 |
| [2026-10-22-legacy-local-fixes](snapshots/2026-10-22-legacy-local-fixes/scorecard.md) | Legacy Django with quick SEO fixes, run locally (17 pages, no Lighthouse, so no Performance group) | 90 (SEO 90, AI 89) |
| [2026-11-11-staging](snapshots/2026-11-11-staging/scorecard.md) | Rebuilt Next.js site on staging, **before** the SEO/AI pass (133 pages, Lighthouse `/` + `/about`). Staging sends noindex, so Lighthouse SEO reads 66 and canonical/www checks fail there by design | 62 (SEO 73, Perf 70, AI 43) |
| [2026-11-11-local-prod](snapshots/2026-11-11-local-prod/scorecard.md) | `feat/seo-ai-search` as a local production build (`pnpm build && pnpm start`, dev seed data, 135 pages, no Lighthouse so no Performance group): canonical + hreflang on every public page, JSON-LD (NGO + WebSite, NewsArticle, Event, discourse Article), `llms.txt`, AI crawlers named in robots.txt, short title suffix, descriptions trimmed to 160 chars | 92 (SEO 85, AI 100) |

The 22 Oct run shows what quick fixes alone reached on the old stack. The rebuild should beat it, with Performance included.

## Files

- `snapshots/<date>-<label>/baseline.json`: raw crawl (per-URL title, description, h1, canonical, hreflang, OG, JSON-LD count, words, images) plus site checks (robots, sitemap, llms.txt, favicon, www redirect).
- `snapshots/<date>-<label>/lh_*.json`: Lighthouse reports, optional; they feed the Performance group.
- `snapshots/<date>-<label>/scorecard.{md,json}`: weighted scores from `scripts/seo/score.py`.
- `ai-prompt-panel.csv`: 15 EN/HI prompts for checking AI answer engines by hand (ChatGPT, Perplexity, Gemini, Claude…). Fill in mention, cited URL and accuracy on each run. It was not filled in for the baseline.

## Re-running

Needs Python 3 with `requests` and `beautifulsoup4`; Lighthouse via `npx lighthouse` (optional).

```bash
d=docs/seo/snapshots/$(date +%F)-staging && mkdir -p $d && cd $d
SEO_BASE=https://staging.saidelhi.org python3 ../../../../scripts/seo/crawl.py   # writes baseline.json here
npx lighthouse https://staging.saidelhi.org/ --form-factor=mobile --output=json --output-path=lh_home.json --quiet --chrome-flags=--headless
cd - && SEO_BASE=https://staging.saidelhi.org python3 scripts/seo/score.py $d   # writes scorecard.md/json
```

`SEO_BASE` defaults to `https://saidelhi.org`. Crawl is polite (0.5 s between requests, max 150 pages). Keep snapshots append-only and add a row to the table above for each run, so the trend stays visible.

Scorer changes (11 Nov 2026): the scorer now recognises the rebuild's post URLs (`/news/<slug>`, `/discourses/<slug>`, `/events/<id>`) alongside legacy `/content/`, falls back to `/about` when there is no `/contact` page, checks title uniqueness only among pages that are their own canonical (filtered `?view=`/`?page=` variants share their base title), and matches `datetime` case-insensitively. The legacy baseline is unaffected (it had no canonicals and already passed the date check); the 11 Nov staging snapshot was re-scored with this version (55 → 62).

Still open after the pass: www → apex redirect (needs the production nginx server block), image alt text (the crawl counts decorative `alt=""` images as missing), pages under 300 words (content), and contact facts on staging (About shows no address/phone/email until the client confirms them).

Caveats when comparing:
- Page counts differ (68 legacy pages vs. the new route set), so percentage checks matter more than raw counts.
- The www→apex check sends a `Host: www.saidelhi.org` header to `SEO_BASE`. On staging, read it as a check of the prod proxy setup.
- The "-None slugs" check targets a legacy Django bug and should stay at 0.
