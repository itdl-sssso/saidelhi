import type { EventPublic, GatheringKind, SevaType } from "@/contract";
import type { IconName } from "@/ui/Icon";

/** Seva type → glyph, matching the seva_type settings vocabulary. */
export const SEVA_ICON: Record<SevaType, IconName> = {
  eye: "eye",
  blood: "droplets",
  medical: "stethoscope",
  narayan_seva: "utensils",
  bal_vikas: "graduation-cap",
  bhajan: "music",
  study_circle: "book-open",
  disaster_relief: "life-buoy",
  cleanliness: "sparkles",
  other: "hand-heart",
};

export const GATHERING_ICON: Record<GatheringKind, IconName> = {
  bhajan: "music",
  study_circle: "book-open",
  bal_vikas: "graduation-cap",
};

/** Volunteers still needed, or null when the event isn't asking for help. */
export function volunteersStillNeeded(e: Pick<EventPublic, "volunteersNeeded" | "volunteersJoined" | "status">): number | null {
  if (e.volunteersNeeded === null || e.status !== "planned") return null;
  const left = e.volunteersNeeded - e.volunteersJoined;
  return left > 0 ? left : null;
}

/** The date an event actually happens on: the new date when postponed. */
export function effectiveStart(e: Pick<EventPublic, "startsAt" | "postponedTo">): string {
  return e.postponedTo ?? e.startsAt;
}
