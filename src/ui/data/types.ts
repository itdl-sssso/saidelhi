// Local mirrors of CONTRACT §4.1–4.2. Swap for imports from src/contract once it lands.

export const EVENT_STATUSES = [
  "draft",
  "awaiting_approval",
  "planned",
  "awaiting_report",
  "report_submitted",
  "approved",
  "cancelled",
  "postponed",
  "escalated",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Public small-number suppression: counts under 5 arrive as { lt5: true }. */
export type PublicCount = number | { lt5: true };

/** value null = not reported: render "—", never 0. */
export type Figure = { value: PublicCount | null; estimate: boolean };
