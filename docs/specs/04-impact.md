# 04 · Impact
**Route** `/impact` · **Audience** public, press, partners, members · **Priority** P0 · **Status** new

## Job
Show credibly, in numbers, the seva done across Delhi NCR. Only approved data.

## Sections
1. **Hero:**
   - "Seva across Delhi NCR", plus a period selector (This year · Last year · All time) and a district filter.
   - Caption: "Figures are approved by district coordinators. Updated nightly."
2. **Headline tiles:** activities held · people served (with note) · volunteer hours · districts and samithis active.
3. **By seva type:** one card per type with 2–3 figures and a link → Program.
   - Blood: camps, units collected, donors.
   - Eye: screened, spectacles given, cataract surgeries.
   - Medical: camps, patients seen.
   - Narayan Seva: meals, ration kits.
   - Bal Vikas: classes held, children enrolled.
4. **District map:** choropleth or bubble map of activities by district; tap → District. Include a table fallback beside or below it.
5. **12-month trend:** activities per month, a line or bars. Months with estimates use a hatched fill plus the legend "Estimate".
6. **Recent completed events:** 5 rows linking to Event.
7. Method note (collapsible): how figures are counted, the double-counting note, the under-5 rule, what "estimate" means.

## States
- Loading skeletons.
- A district with no data: "No approved activity yet."
- With the estimate toggle (state can hide estimates), the label shows in the legend.

## Privacy
No demographics below district level. Show "fewer than 5" in place of small numbers.

## Mobile
Tiles 2×2. The map becomes a ranked district list with bars.

## Acceptance
- Every number has a visible period.
- Estimates are visually distinct and labelled.
- The method note is present.
