// Cached server reads for the home page's own sections (bhajans, discourse picks).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { DiscourseCard, EventPublic } from "@/contract";
import { istDateKey } from "@/lib/format";
import { getDiscourses } from "@/features/discourses/data";
import { getEvents } from "@/features/public/data";

/** Next bhajan gatherings (from today, IST). Revalidates with the events tag. */
export async function getUpcomingBhajans(limit = 3): Promise<EventPublic[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  const res = await getEvents({ sevaType: "bhajan", from: istDateKey(new Date()) }, 1, limit);
  return res.data.slice(0, limit);
}

/** A few discourses for the home page; only call with the `discourses` flag on. */
export async function getHomeDiscourses(limit = 3): Promise<DiscourseCard[]> {
  const res = await getDiscourses({});
  return res ? res.items.slice(0, limit) : [];
}
