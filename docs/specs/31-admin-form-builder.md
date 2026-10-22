# 31 · Form builder
**Route** `/admin/forms/[id]/edit` · **Audience** state admins · **Priority** P1 (the pilot uses hand-written definitions) · **Wireframe first**

## Job
Let the state design and version event forms without a developer. One definition feeds the web form, the Excel template, the WhatsApp question sequence and validation.

## Layout (desktop-first; phone shows a read-only preview)
1. **Top bar:**
   - Template name, version badge ("Draft of v4").
   - Language completeness ("HI: 3 fields missing").
   - Preview (phone frame, EN/HI), "Test submission", Publish.
2. **Left palette:** Number, Text, Date, Time, Dropdown, Multi-select, Yes/No, Repeater group, Photo/file, Section heading, Help text.
3. **Centre canvas:**
   - Sections and fields in order, drag to reorder.
   - **Locked core fields** (samithi, date, venue, people served, volunteers, volunteer hours) carry a lock icon and can't be removed.
4. **Right settings panel** for the selected field:
   - Label EN and HI, help EN and HI.
   - Required; min/max.
   - Show-if rule ("Show when Spectacles given > 0").
   - Cross-field rule builder ("must be ≤ Cataract found").
   - Warning threshold.
   - **KPI mapping** select ("Maps to: spectacles_distributed" or "Custom, not in KPIs").
   - **Personal data** toggle. Turning it on forces a consent field and shows "Excluded from dashboards and exports".
   - Retention period.
5. **Bottom drawer tabs:** Excel preview (column headers) · WhatsApp preview (question sequence as chat bubbles) · Validation summary.

## Rules shown to the user
- Publishing creates a new version. Live links keep the version they were issued with.
- There is no field type for ID numbers.
- Removing a KPI-mapped field shows a warning Dialog.

## Acceptance
- Publish blocked until every field has EN and HI.
- Locked fields are visibly locked.
- The WhatsApp preview updates live.
