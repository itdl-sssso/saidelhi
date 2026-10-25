# 51 · Donate
**Route** `/donate` (+ `/hi/donate`) · **Audience** public donors (Indian) · **Priority** P1 · **Status** new (legacy: donations half of `getinvolved.html`)

## Job
Tell an Indian donor how to give to Sri Sathya Sai Trust, Delhi & Punjab by RTGS/NEFT, and how to get the receipt and 80G certificate afterwards. No online payment gateway.

## Sections
1. Hero: involvement transforms lives; contributions exempt under Section 80G.
2. Bank details card: account name, bank, branch, branch code, account no., IFSC, MICR. Each value has a copy button (aria-label "Copy account number", polite "Copied" live region). Numbers in monospace.
3. Who can donate: Indian nationals and NRIs with an Indian passport; "This account accepts donations from Indian donors only."
4. After you donate: email sp.dl@ssssoindia.org with Name, Address, PAN, Mobile number, Amount transferred, Name of bank, Date of transfer, Transaction number. Mailto button with prefilled subject and a blank-field body template (no personal data).
5. About the Trust: Section 10(23C)(iv) registration; Relief to the Poor, Medical Relief, Education (sponsor a child), General Public Utility.
6. Contact: address, tel link, email, WhatsApp link.

## Rules
- Facts (bank, account, IFSC, MICR, email, phone) live in `src/features/donate/details.ts`; change only on written confirmation from the Trust.
- No image: the legacy donation.webp is a photo of an identifiable person.
- Header "Donate" button and footer link point here (previously an external placeholder URL).
- Hindi text is agent-written and needs native review (bank names and numbers unchanged).

## Acceptance
- Readable at 375px; headings h1, then h2 sections; copy buttons keyboard operable, 44px targets.
- a11y and perf e2e suites include `/donate`.
