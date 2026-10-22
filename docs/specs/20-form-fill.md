# 20 · Form fill
**Route** `/f/[token]/form` · **Audience** coordinators and desk volunteers at or after a camp · **Priority** P0

## Job
Enter the event's data quickly and correctly on a phone, even with bad signal.

## Layout
- Minimal header: event title, language toggle, a save-status indicator ("Saved on this phone · Not sent yet" / "Sent").
- A sticky progress bar for multi-section forms.

## Content
Rendered from the event's locked form version. Design the **eye camp report** as the reference:
1. **Section "About the camp"**, the locked core fields:
   - Samithi (prefilled, read-only), date (prefilled), venue (prefilled, editable), partner hospital.
   - Volunteers (sevadals), volunteer hours.
2. **Section "People"**: registered/screened, male, female, under 18 (optional).
3. **Section "Spectacles"**: total given, then counts per power (+1.0, +1.5, +2.0, +2.5, +3.0, other). Live check: "Powers add up to 63 of 63" turns green.
4. **Section "Cataract"**: found, referred for surgery (≤ found), surgeries done (usually later; "Fill this when you know").
5. **Section "Attach"**: photo of the hospital register (optional, stored privately). The help text says it is never published and ID numbers are never read.
6. **Section "Follow-up list"** (optional repeater, personal data, only with consent): name, age, gender, phone, locality (colony or village only), consent yes/no. Visibly marked "Personal data". Add rows with "+ Add person".
7. Notes.
8. Review step: a summary of all answers, then "Send report".

## Field design
- Numeric keypad for numbers. Big steppers for small counts.
- Inline validation in both languages.
- Warnings (unusual numbers) are yellow and don't block. Errors are red and block.

## States
- Offline: "Saved on this phone. We'll send it when you're back online." Queue indicator.
- Session expired: re-verify by OTP without losing entered data.
- Already submitted: show the summary with "Edit report" (until approval).

## Acceptance
- Can be completed one-handed at 375px.
- Cross-field checks are visible.
- The personal-data section is clearly separated and needs consent.
