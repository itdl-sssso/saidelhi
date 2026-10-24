# 09 · Calendar
**Route** `/calendar` · **Audience** public, members, volunteers · **Priority** P0 · **Status** wireframed, update

## Job
Find upcoming seva and gatherings by date, place or type.

## Sections
1. Heading, plus a view switch: List (default on phone) · Month.
2. **Filters (new):** district, seva type, samithi, "Sevadal needed". Shown as chips, with a filter side sheet on phone.
3. List view: grouped by date. EventScheduleCard rows with time, title, samithi, district, seva icon and a "Sevadal needed" badge → Event.
4. Month view: dots per day; tapping a day lists its events.
5. Recurring gatherings (bhajans, study circles) shown lighter than one-off seva events.
6. "Get these on WhatsApp" opt-in explainer.

## States
- No results: "No seva matches these filters. Try another district or clear filters."
- Cancelled events: struck-through date and a "Cancelled" pill.

## Data
Only events with status Planned or later. Past events link to their results.

## Acceptance
- Every item links to Event.
- Filters persist in the URL.
