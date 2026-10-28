# Review round-1, public pages

Branch: worktree-agent-a65bbca6438316eee. Code edits for all 7 tickets done (snapshot 7173e8d). Browser/visual check at 1280/375/hi still pending.

## Done (code)
1. /about: removed second "Find your centre" button from contact band; pincode search kept (AboutView.tsx).
2. /calendar: `src/ui/Select/Select.module.css` customizable-select (`appearance: base-select`, `::picker(select)` rounded with --radius-md). Chromium only; others keep native list. Applies to all Selects.
3. /centres/map: filter+search+count+list moved into right panel (`MapView.tsx` side), map left full height, list scrolls internally (`Map.module.css`, sticky panel at >=900px; mobile list max-height 60vh, map toggle kept). Hero keeps title + privacy note.
4. /impact: `FigureValue` inline "fewer than 5" now inherits font/size/colour (Figure.module.css). By-district: mapLayout align-items stretch, tile grid fills card height (DistrictMap.module.css).
5. Article: breadcrumb Home > News > title; clock + minutes inline row (`.readTime`).
6. Values: all HI valuePage strings written (messages/hi.json); `HI_PROSE_READY = true`. Heading "{name} के बारे में मन में रखने योग्य वचन". Dharma now medical camps (contract `VALUE_LINKS.dharma` -> sevaType medical, wing service, gathering null; CTA /programs/medical). Shanti copy no longer says Thu/Sun only (valuePage, programs.desc.bhajan, program.lead.bhajan, home.values.shanti en+hi). Teach cards height 100%.
7. /join: WhatsApp JOIN card removed (WhatsAppCard.tsx file left unused). Sevadal count untouched.

## Decisions
- HI text is AGENT-WRITTEN, needs native review.
- Contract change (VALUE_LINKS.dharma) -> lead to log in CONTRACT.md section 10.
- Home value-card dharma still mentions Bal Vikas (home.values.dharma.*), Home not in scope.

## Next
- Visual check pages at 1280/375/hi; fix issues.
- vitest tests/m5-public.test.ts, typecheck, lint; commit.
