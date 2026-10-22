B1 · Pilot core (portal). Follow specs/RULES.md. Use the admin shell from DS additions. Make 5 files.

**Admin – Overview** (/admin, scoped coords, P0)
Job: what needs me today, then how my area is doing.
1. Greeting + scope ("East district · Mon 19 Oct").
2. Needs you, actionable rows:
   - 3 reports to approve → Approvals.
   - 2 camps without a report (inline "Resend link") → Events.
   - 4 WhatsApp messages to check → Inbox.
   - Escalations (state only).
3. KPI tiles this month: activities, people served, volunteer hours, reporting rate (sparkline + Δ).
4. Next 14 days: table of date, title, samithi, pill.
5. Bars by seva type.
6. Quick actions: Plan event, Upload file, Copy form link.
States: "You're all caught up"; new-coordinator onboarding checklist.
Phone: Needs-you first.

**Admin – Event detail** (/admin/events/[id], hub of the portal, P0). Use the sample eye camp.
1. Header: title, type, date, venue, samithi, district, big pill. Primary action changes by status (Approve plan / Send form links / Approve report / Request changes). Menu: edit, postpone, cancel, view public page.
2. Lifecycle stepper: Draft → Awaiting approval → Planned → Event day → Awaiting report → Report submitted → Approved. Each step has time + who ("Approved on WhatsApp by District coordinator, 20 Oct 9:12 AM"). Escalation shown as a branch.
3. Form links panel:
   - Rows per link: purpose (Report / Desk 2 / Public), sent to, status (active · expires 31 Oct · uses 1/1), last opened.
   - Actions: copy, resend on WhatsApp, QR (dialog, A4 poster), extend, revoke. "+ Desk link".
4. Submission: read-only summary by form section; source badge (Form/Upload/WhatsApp/Scan); masked submitter phone; edit history.
5. Public results preview.
6. Attachment: register scan thumb, "Private · never published · deleted 17 Oct 2027".
7. Follow-up count → Follow-up (restricted roles only).
8. Activity log.
States: links disabled before plan approval (say why); after approval read-only + "Reopen" (state only).

**Admin – Review inbox** (list + item, P0)
Job: check non-form data (WhatsApp, raw Excel, scans) that AI drafted. District reviews first; state data team gets escalated items.
List: tabs For me / Escalated to state / Done. Rows: source icon, masked sender, time, matched event or "No event matched", confidence pill (High/Check/Low), age.
Item, split view:
- Left: source (chat thread / sheet / scan with zoom+rotate; ID columns blurred: "ID numbers are not read or stored").
- Right: AI-filled form. Low-confidence fields flagged with a "Why?" hint. Event match selector.
- Actions: Approve into event · Save · Send to state team · Reject with reason (messaged back) · Ask sender.
- Footer: "AI drafted this. A person must approve it before it counts."
Phone: Source and Draft as tabs.

**Admin – Form links** (/admin/links, P0)
- Filters: Active / Expiring 48h / Expired / Revoked; purpose; district; event.
- Table: event, purpose, sent to (masked or "QR poster"), created, expires, uses (1/1, 14/∞), last opened, OTP yes/no.
- Row actions: copy, resend, QR, extend, revoke (confirm: "Anyone with this link will see 'This link is no longer active'").
- "Expiring soon" callout. Never show tokens.

**Form fill** (/f/[token]/form; phone, at or after a camp, P0)
No site nav. Header: event title, language toggle, save status ("Saved on this phone · Not sent" / "Sent"), sticky progress.
Eye camp report:
1. About the camp: samithi/date prefilled read-only; venue; partner; volunteers; volunteer hours.
2. People: screened, male, female, under 18.
3. Spectacles: total + per power. Live check "63 of 63 ✓".
4. Cataract: found; referred (≤ found); surgeries (later, "Fill when you know").
5. Attach register photo: "Private. Never published. ID numbers never read."
6. Optional follow-up list, marked "Personal data", consent required: repeater of name, age, gender, phone, locality (colony/village only).
7. Notes.
8. Review summary → Send report.
Numeric keypad, steppers. Warnings yellow (don't block), errors red. Offline state with send queue. Expired session → re-OTP without losing data.
