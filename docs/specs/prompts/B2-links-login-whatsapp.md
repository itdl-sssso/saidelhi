B2 · Link screens, login, WhatsApp. Follow specs/RULES.md. Minimal layout (emblem placeholder, language toggle, gold rule) for the /f pages.

**Form link – Verify** (/f/[token])
- Event card + purpose label (Report for this camp / Desk 2 entry / Join this seva).
- Report link: phone → "Send code on WhatsApp" → 6-box OTP, resend 30s, "Code not arriving?".
- Desk link: desk name; OTP optional. Public link: bot check, no OTP.
- States: wrong code (3 tries → 10-min lock); phone not on list ("Ask your district coordinator to add your number"); offline ("Connect once to verify; then fill without signal").

**Form link – Submitted**
- "Report sent. Thank you." Key numbers.
- Next: "Your district coordinator will review it on WhatsApp."
- Edit report (until approval) / Close.
- Public variant: "You're down for this seva. We'll remind you the day before."

**Form link – Invalid**
Variants: Expired ("closed on 31 Oct… ask your samithi coordinator"), Revoked, Used up, Not found. Not found shows no event details.

**Admin – Login** (/admin/login)
- Phone (+91) → code on WhatsApp → OTP.
- "Only registered coordinators can sign in."
- Email fallback link. No password.
- Neutral message for unknown numbers. Lockout and expired-code states.

**WhatsApp bot** (chat mockups, EN and HI; mark Meta-template messages)
1. Menu: coordinator (Plan / Report / My events / Help; district adds Approvals); public (What's on near me / Join updates / Contact a centre).
2. Plan: type list → date quick replies → time → venue → Sevadal needed → partner → summary card Confirm/Edit → "Sent to East district for approval".
3. District approval card: Approve / Reject (reason) / Ask. Day-2 reminder; day-3 "passed to state team".
4. After approval: report link + desk-link note. Day-before checklist; day-after "Report here".
5. Report by chat: one question per message, validation, final summary; optional register photo ("Kept private").
6. Report approval card for the district.
7. Login code message (expires 5 min, never share).
8. What's on near me: pincode/district → 5 events.
9. Errors: unrecognised, out of range, timeout, human handoff.
