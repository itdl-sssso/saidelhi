# M3 frontend (portal UI) — progress

Status: code complete per brief; typecheck/lint/build/tests green on main. Interrupted (rate limit) right before the browser walkthrough.

Done: login (/admin/login, OTP), admin shell (permission-filtered side nav, top bar, scope switcher, phone bottom bar), Overview, Events list, Event detail (lifecycle, links panel, QR dialog), Plan/edit event, Approvals, Links, Org, People, Audit. Files: src/app/[locale]/admin/**, src/features/admin/**, src/lib/portal-api.ts, src/proxy.ts (admin routing), messages `admin.*`.

Next: browser walkthrough (see CLAUDE.md "Immediate next steps" #1), fix issues, re-seed. Dedupe: login OTP input lives in src/features/admin — switch to src/ui/OtpInput.
