B3 · Public core. Follow specs/RULES.md. Use the existing public nav/footer, updated:
- Nav: About, Programs, Bhajans, Get involved, Impact, News, Calendar, Discourses (flag), Donate↗, SaiConnect↗, हिंदी/EN, "Coordinator login" (quiet).
- Footer (shared): Impact, Calendar, Centres, Join a seva, Privacy, Donate↗; "All activities are free and open to people of every faith."

**Event** (/events/[id]). Two variants:
- Before (Planned): title, type, pill, date/time; venue → Google Maps↗ + Map; samithi → Centre; district → District; description as entered; "6 Sevadal needed" + Join this seva; what to bring; "With ICARE Eye Hospital"; centre contact only.
- After (Approved): results tiles (115 · 63 · 13); bar of spectacles by power; "Cataract surgeries: 0 of 13 so far"; photos; Read the report → Article.
- States: awaiting/submitted ("Results appear once the district approves"); cancelled/postponed banner.

**Centre** (/centres/[slug])
- Name, district, address → Maps↗, centre contact with copy button.
- Weekly schedule table (bhajan, study circle, Bal Vikas).
- Upcoming → Event. This year here (samithi totals, no demographics). Past events with results.
- Empty state for a new centre.

**Impact** (/impact)
- Period: This year / Last year / All time. District filter. "Approved by district coordinators. Updated nightly."
- Tiles: activities, people served (+note), volunteer hours, districts/samithis active.
- Per seva type cards → Program: blood (camps, units, donors), eye (screened, spectacles, surgeries), medical (camps, patients), Narayan Seva (meals, kits), Bal Vikas (classes, children).
- District map + table fallback. 12-month trend with hatched estimate months. Recent completed events.
- Method note (collapsible).
- Phone: tiles 2×2; map → ranked list.

**Calendar** (update existing)
- List (default on phone) / Month.
- Filter chips: district, seva type, samithi, "Sevadal needed". Side sheet on phone; filters in URL.
- Rows → Event. Recurring gatherings lighter. Cancelled struck through.
- WhatsApp opt-in note. Empty-filter state.

**Home** (update existing A2 3D Lotus Journey; keep hero and petals)
Add:
- Thought for the Day quote.
- Upcoming seva strip (3–6 cards with "Sevadal needed"; horizontal snap on phone).
- Impact snapshot (4 tiles; hidden until data exists).
- Find a centre (pincode search + map preview).
- Join a seva + WhatsApp updates.
- New footer.
