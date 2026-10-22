# 32 · Form links
**Route** `/admin/links` · **Audience** coordinators (scoped), state · **Priority** P0 · **Wireframe first**

## Job
See and control every live form link.

## Content
1. Filters: status (Active · Expiring in 48h · Expired · Revoked), purpose (Report · Desk · Public), district, event.
2. Table:
   - Event, purpose, sent to (masked phone or "QR poster"), created, expires, uses (1/1, 14/∞).
   - Last opened, OTP required (yes/no text).
   - Row actions: copy, resend on WhatsApp, QR, extend, revoke.
3. Revoke confirmation Dialog: "Anyone with this link will see 'This link is no longer active'."
4. Expiring soon callout at the top.

## Acceptance
- Revoke and resend reachable on phone.
- Tokens are never shown, only "Copy link".
