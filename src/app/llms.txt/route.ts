import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { VALUE_ORDER } from "@/contract";
import { env } from "@/server/env";
import { services } from "@/server/services";

/**
 * /llms.txt (llmstxt.org): a plain Markdown map of the public site for AI answer engines, so they
 * can find the authoritative page for a question about the organisation, its seva or its centres.
 * Built from the same data as sitemap.xml; discourses are listed only while that library is public.
 */
async function build(): Promise<string> {
  "use cache";
  cacheLife("hours");
  cacheTag("events", "articles", "centres", "discourses");

  const base = env().APP_URL.replace(/\/$/, "");
  const svc = services();
  const [programs, districts, articles, flags] = await Promise.all([
    svc.programs.list({}),
    svc.districts.list(),
    svc.articles.list({ c: "all", page: 1, pageSize: 15 }),
    svc.flags.flags(),
  ]);
  const discourses = flags.discourses ? await svc.discourses.list({}) : null;

  const link = (title: string, path: string, note?: string) => `- [${title}](${base}${path})${note ? `: ${note}` : ""}`;
  const out = [
    "# Sri Sathya Sai Seva Organisations, Delhi NCR",
    "",
    "> Spiritual and service organisation founded by Bhagawan Sri Sathya Sai Baba. Sevadal members across the 10 districts of Delhi NCR run bhajans, study circles, Sri Sathya Sai Bal Vikas (values education for children) and seva (selfless service) such as medical camps, blood donation and Narayan Seva. Every activity is free and open to people of every faith. Motto: Love All, Serve All.",
    "",
    "English pages are unprefixed; every page has a Hindi version under /hi (for example /hi/about).",
    "",
    "## Start here",
    link("About us", "/about", "who we are, our founder, three wings (service, education, spiritual) and how samithis and districts are organised"),
    link("Upcoming activities", "/calendar", "bhajans, camps and seva across Delhi NCR, with dates and venues"),
    link("Find a centre", "/centres/map", "map of samithi centres with addresses"),
    link("Get involved", "/join", "join a seva as Sevadal, or get updates on WhatsApp"),
    link("Impact", "/impact", "approved seva figures by district and activity type"),
    link("Programmes", "/programs", "every kind of seva and activity the organisation runs"),
    link("News and stories", "/news"),
    link("Photo gallery", "/gallery"),
    link("Donate", "/donate", "donations are always voluntary"),
    link("Privacy", "/privacy"),
    "",
    "## Five human values",
    ...VALUE_ORDER.map((v) => link(v[0].toUpperCase() + v.slice(1), `/values/${v}`)),
    "",
    "## Programmes",
    ...programs.map((p) => link(p.label.en, `/programs/${p.sevaType}`)),
    "",
    "## Districts",
    ...districts.map((d) => link(`${d.district.name.en} district`, `/districts/${d.district.slug}`, `${d.samithiCount} samithis`)),
  ];
  if (discourses?.items.length) {
    out.push("", "## Discourses of Bhagawan Sri Sathya Sai Baba (English and Hindi)", link("Discourse library", "/discourses"));
    out.push(...discourses.items.map((d) => link(d.title.en, `/discourses/${encodeURIComponent(d.slug)}`, `${d.date}, ${d.place}`)));
  }
  if (articles.data.length) {
    out.push("", "## Recent news", ...articles.data.map((a) => link(a.title.en, `/news/${encodeURIComponent(a.slug)}`, a.publishedAt.slice(0, 10))));
  }
  out.push("", "## Optional", link("Sitemap", "/sitemap.xml", "every public page with its Hindi alternate"), "");
  return out.join("\n");
}

export async function GET(): Promise<Response> {
  return new Response(await build(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
