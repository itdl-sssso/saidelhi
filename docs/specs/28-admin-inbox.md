# 28 · Review inbox
**Route** `/admin/inbox`, `/admin/inbox/[id]` · **Audience** district coordinators (first review), state data team (escalated or hard items) · **Priority** P0 · **Wireframe first**

## Job
Check data that didn't come through our forms (WhatsApp messages, raw Excel files, scans) after AI has drafted an entry, then approve, fix or reject it.

## List view
1. Tabs: For me · Escalated to state · Done.
2. Rows:
   - Source icon (WhatsApp / Excel / PDF scan), sender (masked), received time.
   - Matched event (or "No event matched"), AI confidence (High / Check / Low as text pills).
   - Age ("2 days").

## Item view (split screen)
1. **Left: the source.** The WhatsApp message thread, the sheet preview, or the scanned page with zoom and rotate. ID columns in scans are blurred by default with the note "ID numbers are not read or stored".
2. **Right: the draft entry.**
   - The form fields, filled by AI. Low-confidence fields are highlighted, each with a "Why?" hint ("Handwriting unclear").
   - Event match selector: link to an existing event or create one.
3. **Actions:**
   - Approve into event.
   - Save edits.
   - Send to state team (district only).
   - Reject with reason, which is messaged back to the sender on WhatsApp.
   - Ask sender, which sends a WhatsApp question.
4. Footer: "AI drafted this on 19 Oct. A person must approve it before it counts."

## Mobile
Source and draft as two tabs, not side by side.

## Acceptance
- Highlighting does not rely on colour alone (icon plus text).
- Scans show the ID blur.
- Every action names who did it.
