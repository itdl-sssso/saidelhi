# 24 · Overview
**Route** `/admin` · **Audience** samithi, district and state coordinators (scoped) · **Priority** P0 · **Wireframe first**

## Job
Tell me what needs me today, then how my area is doing.

## Admin shell (applies to all portal pages)
- **Left side navigation** with role-filtered groups: Operate, Collect, Organisation, Publish, Communicate, Govern. It collapses to a bottom tab bar plus a "More" sheet on phone.
- **Top bar:**
  - Scope switcher ("East district ▾" / "Samithi Mayur Vihar"; state admins can choose any).
  - Search, language toggle, profile menu (role shown), sign out.

## Sections
1. Greeting with scope, e.g. "East district · Monday 19 Oct".
2. **Needs you** (priority list, each row actionable):
   - Approvals waiting: "3 reports to approve" → Approvals.
   - Events awaiting a report: "2 camps without a report" → Events, filtered; inline "Resend link".
   - Inbox drafts: "4 WhatsApp messages to check" → Review inbox.
   - Escalations (state only): "1 approval escalated from North" → Approvals.
3. **KPI tiles for my scope this month:** activities, people served, volunteer hours, reporting rate (share of samithis that reported). Each has a sparkline and a vs-last-month delta.
4. **Upcoming events, next 14 days:** compact table (date, title, samithi, status pill) → Event detail.
5. **By seva type this month:** small bars.
6. Quick actions: "Plan an event", "Upload a file", "Copy a form link".

## States
- Nothing needs you: "You're all caught up."
- New coordinator with no data: onboarding checklist (add centre timings, plan first event).

## Acceptance
- On phone, "Needs you" is the first thing visible.
- The scope is always visible.
- Numbers match the scope.
