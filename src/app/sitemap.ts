import "server-only";
import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { VALUE_ORDER } from "@/contract";
import { env } from "@/server/env";
import { services } from "@/server/services";

type Entry = MetadataRoute.Sitemap[number];

/** Pages that exist once per site. Admin, form links, dev tools and the API are not listed. */
const STATIC_PATHS = ["", "/calendar", "/impact", "/about", "/programs", "/news", "/join", "/centres/map", "/privacy"];

/** All pages of a paged service call (100 per page, capped so a runaway table cannot hang the build). */
async function all<T>(fetchPage: (page: number) => Promise<{ data: T[]; meta: { total: number } }>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await fetchPage(page);
    out.push(...res.data);
    if (res.data.length === 0 || out.length >= res.meta.total) break;
  }
  return out;
}

async function build(): Promise<Entry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("events", "articles", "centres");

  const base = env().APP_URL.replace(/\/$/, "");
  const svc = services();
  const entry = (path: string, lastModified?: string | Date): Entry => ({
    url: `${base}${path}`,
    ...(lastModified ? { lastModified } : {}),
    // English is unprefixed, Hindi lives under /hi (next-intl, as-needed).
    alternates: { languages: { en: `${base}${path}`, hi: `${base}/hi${path}` } },
  });

  const [articles, events, centres, districts, programs] = await Promise.all([
    all((page) => svc.articles.list({ c: "all", page, pageSize: 100 })),
    all((page) => svc.events.list({ from: "2020-01-01", page, pageSize: 100 })),
    all((page) => svc.centres.list({ page, pageSize: 100 })),
    svc.districts.list(),
    svc.programs.list({}),
  ]);

  return [
    ...STATIC_PATHS.map((p) => entry(p)),
    ...VALUE_ORDER.map((slug) => entry(`/values/${slug}`)),
    ...programs.map((p) => entry(p.href)),
    ...districts.map((d) => entry(`/districts/${d.district.slug}`)),
    ...centres.map((c) => entry(`/centres/${encodeURIComponent(c.slug)}`)),
    ...articles.map((a) => entry(`/news/${encodeURIComponent(a.slug)}`, a.publishedAt)),
    // Approved and planned events; weekly gathering rows and cancelled plans are not pages worth indexing.
    ...events.filter((e) => !e.recurring && e.status !== "cancelled").map((e) => entry(`/events/${e.id}`, e.approvedAt ?? e.startsAt)),
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return build();
}
