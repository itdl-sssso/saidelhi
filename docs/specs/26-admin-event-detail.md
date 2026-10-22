# 26 · Event detail
**Route** `/admin/events/[id]` · **Audience** coordinators (scoped), state · **Priority** P0 · **Wireframe first. The hub of the portal.**

## Job
Everything about one event: where it is in its lifecycle, its form links, the data received and the approval trail.

## Sections
1. **Header:**
   - Title, seva type, date, venue, samithi, district, and a large status pill.
   - Primary action changes with status: "Approve plan" / "Send form links" / "Approve report" / "Request changes".
   - Overflow menu: edit, postpone, cancel, view public page.
2. **Lifecycle timeline** (horizontal stepper, vertical on phone): Draft → Awaiting approval → Planned → Event day → Awaiting report → Report submitted → Approved. Each step has a timestamp and who did it ("Approved on WhatsApp by District coordinator, 20 Oct 9:12 AM"). Escalation shown as a branch.
3. **Form links panel:**
   - One row per link: purpose (Report / Desk 2 / Public), who it went to, status (active · expires 31 Oct · 1 use of 1), last opened.
   - Actions: copy, resend on WhatsApp, show QR (Dialog with printable QR poster), extend, revoke.
   - "Add desk link".
4. **Submissions:**
   - The received report as a read-only summary of the form sections.
   - Source badge (Form · Upload · WhatsApp · Scan) and the submitter's verified phone (masked: +91 98•••••52).
   - Edit history.
5. **Results preview:** exactly what the public Event page will show after approval.
6. **Attachments:** register scan thumbnail, marked "Private · never published", with a retention note ("Deleted on 17 Oct 2027").
7. **Follow-up** (eye camps): count of people on the follow-up list → Follow-up (restricted; hidden for roles without access).
8. **Activity log:** every change, link use and message.

## States
- Before approval, links are disabled with the explanation "Links are sent once the district approves the plan".
- After approval, reports are read-only, with "Reopen for correction" (state only).

## Acceptance
- A coordinator can resend a link in two taps on phone.
- The QR poster is printable at A4.
- Masked phones only.
