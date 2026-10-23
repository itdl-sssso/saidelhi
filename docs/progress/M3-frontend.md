# M3 frontend (portal UI) — progress

Status: DONE. Walkthrough 23 Oct by lead: login (district + samithi), Overview, Approvals approve, Event detail links, qr.pdf (200 PDF), bulk resend, Links, forbidden page, /hi/admin, 375px.
Fixes: Admin.module.css srOnly/tblScroll (page h-scroll from sr-only th span); Shell.module.css ≤420px scope pill shrink; overview.ts hi plurals; seed-data.ts report links for overdue events 20/21.

Done: login (/admin/login, OTP), admin shell (permission-filtered side nav, top bar, scope switcher, phone bottom bar), Overview, Events list, Event detail (lifecycle, links panel, QR dialog), Plan/edit event, Approvals, Links, Org, People, Audit. Files: src/app/[locale]/admin/**, src/features/admin/**, src/lib/portal-api.ts, src/proxy.ts (admin routing), messages `admin.*`.

Next: browser walkthrough (see CLAUDE.md "Immediate next steps" #1), fix issues, re-seed. Dedupe: login OTP input lives in src/features/admin — switch to src/ui/OtpInput.
