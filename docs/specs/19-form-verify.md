# 19 · Form link: verify
**Route** `/f/[token]` · **Audience** the coordinator, a desk volunteer or a public sign-up who received a link · **Priority** P0

## Job
Confirm the link is valid and, for report links, that the person is allowed to use it, before showing the form.

## Layout
A minimal page: no site nav, just the emblem placeholder, language toggle and Sarva Dharma rule.

## Content
1. Event card: title, date, venue, samithi. Purpose label: "Report for this camp" / "Desk 2 entry" / "Join this seva".
2. **Report links:** "Enter your phone number" (prefilled mask), then "Send code on WhatsApp", then a 6-digit OTP field (auto-advance boxes) and "Verify". Include a "Resend in 30s" timer and a "Code not arriving?" help line.
3. **Desk links:** desk name shown ("Desk 2 – Mayur Vihar"); optional OTP depending on settings.
4. **Public links:** no OTP. Show a bot check and continue.

## States
- Wrong code (3 tries, then a 10-minute lock).
- Phone not on this event's list: "This link is for the event's coordinators. Ask your district coordinator to add your number."
- Offline: "You're offline. Connect once to verify; after that you can fill the form without signal."

## Acceptance
- Works at 375px with one thumb.
- No personal data in the URL.
- The token is never displayed.
