# M4 frontend progress

Worktree `.claude/worktrees/agent-ab1cd63aea1a4f2b9`, branch `worktree-agent-a4b97a7b39548f876`, base `5272d93`.

## Done
- Task 1 Review inbox `/admin/inbox`, `/admin/inbox/[id]` (`src/features/admin/inbox/*`). Client-fetched via `useApi`.
- Task 2 WhatsApp admin `/admin/whatsapp` (`src/features/admin/whatsapp/*`), nav `alsoFor` for `whatsapp.reminders`.
- Verified 375px no horizontal scroll and `/hi` for inbox, item, all 5 WhatsApp tabs.

## In progress
- (none)

## Next
- Task 3 dev simulator `/dev/whatsapp`
- Task 4 backlog (a) approvedAt/centre (b) calendar orgUnits + recurring (c) HTTP 404 (d) OtpInput dedupe
- final DoD

## Decisions
- Inbox/WhatsApp pages fetch on the client (`useApi`, `src/features/admin/useApi.ts`) so they do not depend on backend services existing in this branch; `meta` of list envelopes is kept (src/lib/api.ts drops it).
- DEV-ONLY fixture shim: `src/features/admin/devFixture.ts` (+ `useApi` fixture arg, `useAction` `devFixture` option, `__fixtures__` folders in inbox/ and whatsapp/, `public/dev/register-scan.svg`). Only when `NODE_ENV=development` and the route answers HTML 404 / 501. Remove after backend merge: `grep -rn devFixture src`.
- `FieldRenderer` got optional `ctx.marks` (AI confidence notes, icon + text + left rule) for the inbox draft.
- Local worktree uses `DATA_SOURCE=db` (mock repo state is per-bundle in dev, login does not carry to pages); `EXTRACTOR_PROVIDER=stub` in `.env.local` (branch env.ts has not got `rules` yet).

## Blockers
- none
