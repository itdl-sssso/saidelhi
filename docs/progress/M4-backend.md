# M4 backend progress

## Done (all 13 tasks)
- T1 backlog: `EventPublic.approvedAt` (from `event.approved_at`), `GET /org/units`, gathering occurrences in `GET /events` (`services/gatherings.ts`, id `gath_<id>_<YYYYMMDD>`, 28-day horizon when no `to`), `FormPayload.editable`, seed label "Under 18".
- T2 tables: `drizzle/0003_m4_whatsapp.sql` + `0004_m4_whatsapp_msg_index.sql` (additive). Repo port `repo/wa-types.ts` with `wa-mock.ts` (seeded from `mock/fixtures/wa.ts`) and `wa-db.ts`.
- T3 bot: `src/server/whatsapp/bot/*` (engine, menu, plan, report, approvals, public, copy EN+HI, parse). Entry `services().wa.handle()`.
- T4 webhook `/whatsapp/webhook` (GET verify, POST signed, processed in `after()`), `LoggedWhatsApp` decorator logs every outbound to `whatsapp_message` (login codes masked).
- T5 simulator `/dev/whatsapp/{inbound,messages,reset}` (404 unless console provider + non-prod).
- T6 extractor `src/server/ai` (rules, ollama, createExtractor); env `EXTRACTOR_PROVIDER=rules|ollama`.
- T7 inbox service + routes (RBAC, audit, WhatsApp to sender, reply appends to thread).
- T8 wa admin service + routes (templates, reminders, broadcasts, log, status).
- T9 opt-in (`GET` challenge + `POST /whatsapp/optin`), YES/STOP via bot.
- T10 reminders cron `POST /cron/reminders` (day_before, day_after, +3, +7, approval_day2 rules honoured).
- T11 404: unknown ids/gath ids -> 404 in API (tested). Unbuilt `/admin/*` pages are frontend.
- T12 seed: 5 inbox items, templates, rules, 5 conversations, 12 opt-ins, event `eyeMayurCamp` (awaiting_report, Mayur Vihar) for chat report/inbox demo.
- T13 tests: whatsapp-bot, extractor (+live ollama smoke), inbox, wa-admin (admin, broadcast, optin, webhook, reminders), m4-public, wa.db.integration.

## Decisions
- Opt-in stored in `whatsapp_optin` (consent_record is submission-bound); web request = pending, YES = opted_in, STOP = stopped.
- `links.submitExternal` / `links.reportContext`: submissions from chat/inbox, `NewSubmissionWrite.linkId` nullable.
- Bot sends interactive messages; outside the 24h window planners/senders get templates (`plan_decision`, `review_message`, `optin_confirm` are new, need Meta approval).
- District approval card pushed only to district coordinators inside their 24h window.
- Reminder rules are global (a district coordinator toggling affects everyone).

## Open
- Register photos in chat are acknowledged and counted in audit; bytes are stored only for inbox ingest (storage path `inbox/<id>.<ext>`).
- No retention purge for whatsapp_message / inbox media; no per-number rate limit on inbound bot messages.
