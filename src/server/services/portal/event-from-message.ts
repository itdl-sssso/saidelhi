// Plan event prefill from a forwarded WhatsApp message (contract v0.9.4): the
// extractor reads the message, this maps it onto the Plan event form. Nothing
// is saved; the coordinator checks the form and saves it as usual.
import type { EventExtract, EventFromMessage, PlanField } from "@/contract";
import { type Actor, assertCan, inScope } from "../../auth/rbac";
import type { OrgIndex } from "../org-index";
import { loadOrg, type PortalCtx } from "./shared";

/** Extract fields behind each form field. */
const SOURCES: Record<PlanField, readonly (keyof EventExtract)[]> = {
  sevaType: ["sevaType"],
  title: ["title"],
  startsAt: ["date", "startTime"],
  endsAt: ["endTime"],
  samithiId: ["samithi"],
  venueName: ["venueName"],
  venueAddress: ["venueAddress"],
  volunteersNeeded: ["volunteersNeeded"],
  bring: ["bring"],
  description: ["topic", "audience", "partner", "services", "recurrence", "sevadalNote"],
};
/** The form cannot be saved without these. */
const REQUIRED: readonly PlanField[] = ["sevaType", "title", "startsAt", "samithiId", "venueName"];

/** Pure mapping, exported for tests. `samithiId` is already resolved and scope-checked. */
export function planPrefill(x: EventExtract, samithiId: string | null): EventFromMessage {
  const description = [
    x.topic && `Topic: ${x.topic}`,
    x.audience && `For: ${x.audience}`,
    x.partner && `With: ${x.partner}`,
    x.services.length > 0 && `Services: ${x.services.join(", ")}`,
    x.recurrence && `Every: ${x.recurrence.text}`,
    x.sevadalNote && `Sevadals: ${x.sevadalNote}`,
  ]
    .filter(Boolean)
    .join("\n");
  const prefill: EventFromMessage["prefill"] = {
    sevaType: x.sevaType,
    title: x.title,
    date: x.date,
    startTime: x.startTime,
    endTime: x.endTime,
    samithiId,
    venueName: x.venueName,
    venueAddress: x.venueAddress,
    volunteersNeeded: x.volunteersNeeded,
    bring: x.bring,
    description,
    recurring: x.recurrence !== null,
  };
  const blank: Partial<Record<PlanField, boolean>> = {
    sevaType: !prefill.sevaType,
    title: !prefill.title,
    startsAt: !prefill.date || !prefill.startTime,
    samithiId: !samithiId,
    venueName: !prefill.venueName,
  };
  const check = (Object.keys(SOURCES) as PlanField[]).filter((f) => {
    if (REQUIRED.includes(f) && blank[f]) return true;
    return SOURCES[f].some((k) => {
      const c = x.fieldConfidence[k];
      return c !== undefined && c.level !== "high";
    });
  });
  return { extract: x, prefill, check };
}

/** Samithi named in the message, only if the viewer may plan for it. */
function samithiFor(actor: Actor, org: OrgIndex, x: EventExtract): string | null {
  const unit = x.samithi?.slug ? org.samithi(x.samithi.slug) : undefined;
  return unit && inScope(actor, unit.id) ? unit.id : null;
}

export async function eventFromMessage(ctx: PortalCtx, actor: Actor, text: string): Promise<EventFromMessage> {
  assertCan(actor, "events.plan");
  const [org, x] = await Promise.all([loadOrg(ctx.repo), ctx.deps.extractor.extractEvent({ text, now: ctx.deps.now() })]);
  return planPrefill(x, samithiFor(actor, org, x));
}
