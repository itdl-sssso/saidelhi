# WhatsApp Cloud API — setup guide

What the platform needs from Meta, in order. Pricing and policy change often — confirm each step on Meta's current docs (developers.facebook.com/docs/whatsapp/cloud-api) before paying for anything.

## 1. Decide the number
- **Existing organisation number** (spec 50 says "check coexistence"): Meta's *coexistence* onboarding lets a number keep working in the WhatsApp Business **app** while the Cloud API uses it too. It requires onboarding through Embedded Signup and the app being on a recent version. Check the number is a WhatsApp Business app number (not personal WhatsApp).
- **New dedicated number** (simpler): any number that can receive an SMS/voice call once for verification and is not registered on WhatsApp.

## 2. Accounts
1. **Meta Business portfolio** (business.facebook.com) owned by the organisation, not a person. Add 2 admins.
2. **Business verification** (Settings → Security centre): legal name, address, a document (trust/society registration). Needed to lift messaging limits and get a display name approved.
3. **Meta developer app** (developers.facebook.com → My apps → Create → type *Business*) linked to that portfolio. Add the **WhatsApp** product.

## 3. Values to collect → put in `.env.local` (never commit)
| Env var | Where it comes from |
|---|---|
| `WHATSAPP_PROVIDER=cloud` | switches from the console mock |
| `WA_PHONE_NUMBER_ID` | WhatsApp → API setup → Phone number ID |
| `WA_BUSINESS_ACCOUNT_ID` | WhatsApp → API setup → WhatsApp Business Account ID |
| `WA_ACCESS_TOKEN` | **System user** permanent token: Business settings → Users → System users → Add (admin) → assign the app + WABA → Generate token with `whatsapp_business_messaging`, `whatsapp_business_management`. Do not use the 24-hour temporary token in production. |
| `WA_APP_SECRET` | App settings → Basic → App secret (used to verify `X-Hub-Signature-256` on webhooks) |
| `WA_VERIFY_TOKEN` | Any random string you choose; entered in the webhook config |
| `WA_GRAPH_VERSION` | e.g. `v23.0` (use the latest listed in the dashboard) |

## 4. Webhook
- Callback URL: `https://<domain>/api/v1/whatsapp/webhook` (must be public HTTPS; for local testing use a tunnel such as `cloudflared tunnel --url http://localhost:3000`).
- Verify token: `WA_VERIFY_TOKEN`.
- Subscribe the WABA to the **messages** field.

## 5. Message templates (need Meta approval, EN + HI each)
Messages the bot *starts* (outside a 24-hour reply window) must be approved templates.
| Template | Category | Used for |
|---|---|---|
| `login_code` | Authentication (OTP, copy-code button) | portal login + report-link verification |
| `plan_approval_request` | Utility | district approve/reject/ask on a plan |
| `report_approval_request` | Utility | district approval of a report |
| `form_link_sent` | Utility | report/desk link after approval |
| `event_reminder_day_before` | Utility | checklist day before |
| `report_reminder` | Utility | day after, +3, +7 |
| `escalation_notice` | Utility | day-3 escalation to state |
| `invite_coordinator` | Utility | People → Invite |
| `volunteer_reminder` | Utility | "You're down for this seva" |
| `seva_broadcast` | Marketing | opted-in volunteer broadcasts (costs most; opt-in required) |

The repo seeds these definitions in `whatsapp_template` so they can be submitted from Admin → WhatsApp once credentials exist.

## 6. Cost
Meta charges per delivered **template** message, by category (authentication < utility < marketing) and by recipient country (India rates). Replies inside a customer-initiated 24-hour window are free-form; check whether utility templates sent inside that window are free under the current pricing. Admin → WhatsApp shows the estimate before any broadcast. State pays (decision log).

## 7. Until credentials arrive
`WHATSAPP_PROVIDER=console` prints every outgoing message (including OTP codes) to the server log and exposes `/admin/whatsapp` dev simulator to send inbound messages. Nothing else changes when switching to `cloud`.
