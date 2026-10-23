// Cached server reads for the public discourse pages (CONTRACT §10 v0.8). Flag off → null (callers 404).
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { DiscourseDetail, DiscoursesPayload, DiscoursesQuery } from "@/contract";
import { services } from "@/server/services";
import { fixtureDetail, fixtureList } from "./dev-fixtures";

// TEMP M7: backend service shape is not merged yet; use it when present, else placeholder fixtures.
type DiscoursesService = {
  list(q: DiscoursesQuery): Promise<DiscoursesPayload | null>;
  bySlug(slug: string): Promise<DiscourseDetail | null>;
};
const backend = (): DiscoursesService | undefined => (services() as unknown as { discourses?: DiscoursesService }).discourses;

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
  const svc = backend();
  if (svc) return svc.list(q);
  return (await services().flags.flags()).discourses ? fixtureList(q) : null;
}

export async function getDiscourse(slug: string): Promise<DiscourseDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("discourses", `discourse:${slug}`);
  const svc = backend();
  if (svc) return svc.bySlug(slug);
  return (await services().flags.flags()).discourses ? fixtureDetail(slug) : null;
}
