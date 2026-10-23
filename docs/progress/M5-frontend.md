# M5 frontend progress

## Done
- node_modules real install in worktree; `leaflet` + `@types/leaflet` added.
- Icon registry: +briefcase flower-2 gift hand languages layout-grid leaf moon shirt wind.
- TEMP `features/public/dev-fixtures.ts` (values, programs, program, join, districts index).

## In progress
- data layer (`features/public/data.ts`)

## Next
News, Article, District, Map, Programs, Program, Values, About, Join, shell/404 moved.

## Decisions
- New services missing in worktree (values, programs, join, districts.list): `data.ts` uses service when present, else `dev-fixtures.ts` (TEMP M5).
- Editorial copy in messages; HI agent-written => NATIVE REVIEW needed (all new HI strings in about/programs/program/values/join/map/district/news/article namespaces).

## Blockers
none
