# 50 · WhatsApp bot conversations
**Channel** WhatsApp (existing organisation number; check coexistence) · **Audience** coordinators, district coordinators, public · **Priority** P0

## Job
Design the conversation flows as chat mockups: bubbles, quick-reply buttons and list messages. Bilingual: the user picks a language once, and it is remembered.

## Flows
1. **Main menu** (registered coordinator): Plan an activity · Report totals · My events · Help. District coordinators also see Approvals. Public numbers see: What's on near me · Join updates · Contact a centre.
2. **Plan an activity:**
   - Seva type (list) → date (quick replies: Today, Tomorrow, pick) → time → venue (free text) → volunteers needed (number) → partner (optional).
   - Then a summary card with Confirm / Edit, and "Sent to East district for approval".
3. **District approval:**
   - Message to the district: summary card with Approve / Reject / Ask.
   - Reject asks for a reason.
   - Day 2 reminder. Day 3: "This has been passed to the state team."
4. **Form links:** after approval, the coordinator gets the report link and the desk-link instructions. Day before: checklist. Day after: "How did the camp go? Report here."
5. **Report totals by chat:** the form's question sequence, one question per message with number validation and a final summary to confirm. A photo of the register can be attached ("Kept private. ID numbers are never read.").
6. **Report approval:** district gets the key numbers with Approve / Request changes.
7. **Login code:** "Your code is 482913. It expires in 5 minutes. Never share it."
8. **What's on near me:** ask for pincode or district, then up to 5 events with links.
9. **Errors:** unrecognised input, number out of range, session timeout ("Let's start again"), human handoff ("A coordinator will reply").

## Acceptance
- Every flow mocked in EN and HI.
- Message templates that need Meta approval are marked.
- No personal data requested beyond what the flow needs.
