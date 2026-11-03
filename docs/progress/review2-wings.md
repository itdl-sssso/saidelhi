# review2-wings progress (caveman)
## done
- Wing enum -> 3 (service, educational, spiritual). Removed mahila/youth: enums, ProgramsView, AboutView, home.ts, messages (programs, about, admin.wing), CONTRACT.md + §10 v0.10.2.
- legacy-wings.md copied to docs/content, committed.
- Legacy EN copy verbatim: wingIntro.* in programs msgs, home DEFAULT_WINGS summaries, about wingDesc, threeWings intro. Stray ")" fixed. HI = agent-written (needs native review).
- Metrics: kpi defs bhajan.attendees, study.attendees, relief.people; EXTRA_KEYS in services/programs.ts. No data -> empty state, no fake 0.
- Cross-links: ProgramDetail.related (ProgramLink[]); "More in wing" + "All sevas" chips.
- Nav Bhajans -> /programs/bhajan; bhajan page has practices block (Veda, Bhajans, Jyoti) + find-centre CTA.
- HomeSections.tsx: removed mahila/youth icon lines (other track owns; minimal).
## next
- vitest (m5-public, m6-wave-b, legacy-content) green; typecheck+lint green; curl 200 + 375px no overflow checked.
## notes
- home.wingGloss mahila/youth msgs left (home.* other track).
