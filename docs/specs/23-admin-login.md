# 23 · Portal login (WhatsApp OTP)
**Route** `/admin/login` · **Audience** all portal roles · **Priority** P0

## Job
Sign in with a phone number and a code sent on WhatsApp.

## Content
1. Emblem placeholder, "Coordinator portal", language toggle.
2. Phone number field (+91 prefix), then "Send code on WhatsApp".
3. 6-digit OTP boxes, "Verify", "Resend in 30s".
4. Help: "Only registered coordinators can sign in. Ask your district coordinator to add you."
5. Fallback link: "WhatsApp not working? Get the code by email" (only for accounts with an email on file).

## States
- Unknown number (same neutral message as a known one, to avoid revealing who is registered).
- Too many attempts.
- Code expired.

## Acceptance
- No password field anywhere.
- No SaiConnect sign-in (it is only an external link on the public site).
