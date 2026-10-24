import "server-only";
import { EventsQuery, CentresQuery } from "@/contract";
import { permissionsFor, type Actor } from "@/server/auth/rbac";
import { appSecret } from "@/server/env";
import { devLinks } from "@/server/forms/seed-data";
import { services } from "@/server/services";
import { EMPTY_SAMPLES, type Samples } from "./catalog";

const first = async <T>(fn: () => Promise<T | undefined | null>): Promise<T | null> => {
  try {
    return (await fn()) ?? null;
  } catch {
    return null;
  }
};

/** Synthetic NCR-wide actor: only used to read the first row of portal lists for sample ids (dev only). */
function stateActor(): Actor {
  return {
    userId: "dev-review",
    name: "Dev review",
    role: "state_admin",
    scopeId: null,
    all: true,
    unitIds: new Set<string>(),
    permissions: new Set(permissionsFor("state_admin")),
    ctx: { requestId: null, ipHash: null },
  };
}

/** Real seed examples for the dynamic routes. Every lookup is best-effort: a miss just drops that item. */
export async function resolveSamples(): Promise<Samples> {
  const s = services();
  const actor = stateActor();
  const out: Samples = { ...EMPTY_SAMPLES, tokens: {}, admin: {} };

  const events = await first(() => s.events.list(EventsQuery.parse({ pageSize: 100 })));
  out.eventId = events?.data.find((e) => !e.id.startsWith("gath_"))?.id ?? null;
  out.centreSlug = (await first(() => s.centres.list(CentresQuery.parse({}))))?.data[0]?.slug ?? null;
  out.districtSlug = (await first(() => s.districts.list()))?.[0]?.district.slug ?? null;
  out.articleSlug = (await first(() => s.articles.list({ page: 1, pageSize: 1 } as never)))?.data[0]?.slug ?? null;
  out.programType = (await first(() => s.programs.list({})))?.[0]?.sevaType ?? null;
  out.discourseSlug = (await first(() => s.discourses.list({})))?.items?.[0]?.slug ?? null;

  try {
    for (const l of devLinks(appSecret())) out.tokens[l.key] = l.token;
  } catch {
    /* tokens stay empty */
  }

  const adminEvents = await first(() => s.portal.events.list(actor, { page: 1, pageSize: 1 } as never));
  out.admin.eventId = (adminEvents as { data?: { id: string }[] } | null)?.data?.[0]?.id;
  out.admin.centreId = (await first(() => s.portal.centres.list(actor, { page: 1, pageSize: 1 } as never)))?.data[0]?.id;
  out.admin.contentId = (await first(() => s.portal.content.list(actor, { page: 1, pageSize: 1 } as never)))?.data[0]?.id;
  out.admin.formId = (await first(() => s.portal.forms.list(actor)))?.templates[0]?.id;
  out.admin.inboxId = (await first(() => s.wa.inbox.list(actor, { tab: "for_me", page: 1, pageSize: 1 })))?.data[0]?.id;
  return out;
}
