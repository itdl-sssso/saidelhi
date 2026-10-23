# M4 backend progress

## Done
- T1 backlog: approvedAt, GET /org/units (+OrgUnitsQuery), gathering occurrences in GET /events (services/gatherings.ts), FormPayload.editable, seed label.
- T2 (partial): drizzle/0003_m4_whatsapp.sql applied (schema/whatsapp.ts).

## In progress
- T2 repo port wa (repo/wa-types.ts, wa-mock.ts, wa-db.ts)

## Next
T3 bot, T4 webhook, T5 simulator, T6 extractor, T7 inbox, T8 wa admin, T9 optin, T10 reminders cron, T12 seed, T13 tests

## Decisions
- Provider decorator logs every outbound to repo.wa (console + cloud).
- Opt-in stored in whatsapp_optin (consent_record is submission-bound).
- links.submitExternal(): submissions without a link (NewSubmissionWrite.linkId nullable).
- CronJob += "reminders".
