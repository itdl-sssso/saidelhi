// TEMP M5 until backend merge: contract-shaped stand-ins for the M5 services
// (values, programs, join, districts index). `data.ts` calls the real service when
// `services()` exposes it and falls back here otherwise. Integration deletes this file.
import "server-only";
import type {
  DistrictSummary,
  EventPublic,
  JoinPayload,
  JoinQuery,
  ProgramCard,
  ProgramDetail,
  SevaType,
  ValuePayload,
  ValueSlug,
  Wing,
} from "@/contract";
import { VALUE_LINKS, VALUE_ORDER } from "@/contract";
import { services } from "@/server/services";
import en from "../../../messages/en.json";
import hi from "../../../messages/hi.json";
import { SEVA_ICON } from "./seva";

const ACTIVE: SevaType[] = ["eye", "blood", "medical", "narayan_seva", "bal_vikas", "bhajan", "study_circle", "cleanliness", "disaster_relief"];
const WING: Record<SevaType, Wing> = {
  eye: "service",
  blood: "service",
  medical: "service",
  narayan_seva: "service",
  bal_vikas: "educational",
  bhajan: "spiritual",
  study_circle: "spiritual",
  cleanliness: "service",
  disaster_relief: "service",
  other: "service",
};

const label = (t: SevaType) => ({ en: en.seva[t], hi: hi.seva[t] });

async function upcoming(sevaTypes: readonly SevaType[], pageSize: number): Promise<EventPublic[]> {
  const from = new Date().toISOString().slice(0, 10);
  const rows = await Promise.all(sevaTypes.map((s) => services().events.list({ from, sevaType: s, page: 1, pageSize })));
  return rows
    .flatMap((r) => r.data)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, pageSize);
}

export async function fixtureValue(slug: ValueSlug): Promise<ValuePayload> {
  const i = VALUE_ORDER.indexOf(slug);
  const links = VALUE_LINKS[slug];
  return {
    slug,
    prev: VALUE_ORDER[(i + VALUE_ORDER.length - 1) % VALUE_ORDER.length],
    next: VALUE_ORDER[(i + 1) % VALUE_ORDER.length],
    lived: { sevaType: links.sevaType, wing: links.wing },
    facts: [],
    upcoming: await upcoming(links.sevaTypes, 3),
    discourses: null,
  };
}

export async function fixturePrograms(wing?: Wing): Promise<ProgramCard[]> {
  return Promise.all(
    ACTIVE.filter((t) => !wing || WING[t] === wing).map(async (t): Promise<ProgramCard> => {
      const [next] = await upcoming([t], 1);
      return {
        sevaType: t,
        label: label(t),
        icon: SEVA_ICON[t],
        wing: WING[t],
        next: next ? { eventId: next.id, startsAt: next.startsAt, district: next.district } : null,
        thisYear: null,
        href: `/programs/${t}`,
      };
    }),
  );
}

export async function fixtureProgram(type: SevaType): Promise<ProgramDetail | null> {
  if (!ACTIVE.includes(type)) return null;
  const articles = await services().articles.list({ c: "all", page: 1, pageSize: 3 });
  const funnelKeys = type === "eye" ? (["found", "referred", "operated"] as const) : null;
  return {
    sevaType: type,
    label: label(type),
    icon: SEVA_ICON[type],
    wing: WING[type],
    href: `/programs/${type}`,
    kpis: null,
    funnel: funnelKeys
      ? funnelKeys.map((k) => ({
          key: k,
          label: { en: k[0].toUpperCase() + k.slice(1), hi: null },
          figure: { value: null, estimate: false },
        }))
      : null,
    upcoming: await upcoming([type], 6),
    articles: articles.data,
    partners: [],
  };
}

export async function fixtureJoin(q: JoinQuery): Promise<JoinPayload> {
  const from = q.from ?? new Date().toISOString().slice(0, 10);
  const res = await services().events.list({
    from,
    to: q.to,
    district: q.district,
    sevaType: q.sevaType,
    needsVolunteers: true,
    page: q.page,
    pageSize: q.pageSize,
  });
  const digits = (process.env.WA_DISPLAY_NUMBER ?? process.env.WHATSAPP_PUBLIC_NUMBER ?? "").replace(/\D/g, "");
  return {
    events: { data: res.data.filter((e) => !e.recurring), meta: res.meta },
    whatsapp: {
      number: digits ? `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}` : null,
      waMeUrl: digits ? `https://wa.me/${digits}?text=JOIN` : null,
      keyword: "JOIN",
    },
  };
}

export async function fixtureDistricts(): Promise<DistrictSummary[]> {
  const [districts, samithis] = await Promise.all([
    services().districts.units({ kind: "district" }),
    services().districts.units({ kind: "samithi" }),
  ]);
  return districts.map((d) => {
    const n = samithis.filter((s) => s.parentId === d.id).length;
    return { district: { id: d.id, slug: d.slug, name: d.name }, samithiCount: n, centreCount: n };
  });
}
