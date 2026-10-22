# 48 · Audit log
**Route** `/admin/audit` · **Audience** state admins, PII officer · **Priority** P1

## Content
An append-only table: time, who (role), action (approve, edit, export, view personal data, revoke link, publish), item, before/after (expandable). Filters and search. No edit or delete actions.
