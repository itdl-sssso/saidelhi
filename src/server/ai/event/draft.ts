import type { EventExtract } from "@/contract";
import { istInstant } from "../../domain/time";

/** EventExtract before the instants and the model label are added. */
export type Draft = Omit<EventExtract, "startsAt" | "endsAt" | "model">;
/** Fields a rule or the model can fill. */
export type Field = Exclude<keyof Draft, "fieldConfidence" | "rejected">;

export const FIELDS = [
  "kind",
  "sevaType",
  "title",
  "samithi",
  "date",
  "endDate",
  "startTime",
  "endTime",
  "recurrence",
  "venueName",
  "venueAddress",
  "partner",
  "topic",
  "audience",
  "services",
  "bring",
  "volunteersNeeded",
  "target",
  "contact",
  "sevadalNote",
] as const satisfies readonly Field[];

export function emptyDraft(): Draft {
  return {
    kind: "other",
    sevaType: null,
    title: null,
    samithi: null,
    date: null,
    endDate: null,
    startTime: null,
    endTime: null,
    recurrence: null,
    venueName: null,
    venueAddress: null,
    partner: null,
    topic: null,
    audience: null,
    services: [],
    bring: [],
    volunteersNeeded: null,
    target: null,
    contact: null,
    sevadalNote: null,
    fieldConfidence: {},
    rejected: [],
  };
}

export const isEmpty = (d: Draft, f: Field) => {
  const v = d[f];
  return v === null || (Array.isArray(v) && v.length === 0);
};

/** Adds startsAt/endsAt (IST) and the model label. */
export function finishDraft(d: Draft, model: string): EventExtract {
  const startsAt = d.date && d.startTime ? istInstant(d.date, d.startTime).toISOString() : null;
  let endsAt = d.date && d.endTime ? istInstant(d.endDate ?? d.date, d.endTime).toISOString() : null;
  if (startsAt && endsAt && endsAt <= startsAt) endsAt = null;
  return { ...d, startsAt, endsAt, model };
}
