// Cached server reads for the public discourse pages (CONTRACT §10 v0.8). Flag off → null (callers 404).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { DiscourseDetail, DiscoursesPayload, DiscoursesQuery } from "@/contract";
import { services } from "@/server/services";

export async function getDiscourseFlag(): Promise<boolean> {
  "use cache";
  cacheLife("minutes");
  cacheTag("discourses");
  return (await services().flags.flags()).discourses;
}

export async function getDiscourses(q: DiscoursesQuery): Promise<DiscoursesPayload | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("discourses");
  return services().discourses.list(q);
}

export async function getDiscourse(slug: string): Promise<DiscourseDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("discourses", `discourse:${slug}`);
  return services().discourses.bySlug(slug);
}
