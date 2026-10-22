// Server-side gate for portal pages: session (or redirect to login with ?next=) and permission check.
import "server-only";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { OrgTreeNode, Permission } from "@/contract";
import { redirect } from "@/i18n/navigation";
import { initLocale } from "@/i18n/server";
import { type AppLocale, tx } from "@/lib/format";
import { getSession, type PortalSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { services } from "@/server/services";

export interface PortalPage {
  session: PortalSession;
  locale: AppLocale;
  /** False when the signed-in role lacks `permission`: render <NoAccess />. */
  allowed: boolean;
}

/** Call at the top of every portal page. `next` is the path (with query) to return to after sign-in. */
export async function requirePortal(next: string, permission?: Permission): Promise<PortalPage> {
  const locale = await initLocale();
  // getSession() reads the clock for request ids; opt into request-time rendering first (Cache Components).
  await connection();
  const session = await getSession();
  if (!session) redirect({ href: { pathname: "/admin/login", query: { next } }, locale });
  return { session: session!, locale, allowed: !permission || session!.actor.permissions.has(permission) };
}

/** Runs a service call, turning NOT_FOUND into the 404 page and FORBIDDEN into `null`. */
export async function guarded<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === "NOT_FOUND") notFound();
      if (err.code === "FORBIDDEN") return null;
    }
    throw err;
  }
}

/** Single string value of a search param. */
export function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export type SearchParams = Record<string, string | string[] | undefined>;

/** Query string (with leading ?) for a path-with-filters, e.g. for the login `next` value. */
export function withParams(path: string, sp: SearchParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = one(v);
    if (s) qs.set(k, s);
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export interface OrgOptions {
  districts: Array<{ value: string; label: string }>;
  samithis: Array<{ value: string; label: string; districtId: string }>;
}

/** Districts and samithis in the viewer's scope, for filter selects and pickers. Inactive units are left out. */
export async function orgOptions(session: PortalSession, locale: AppLocale): Promise<OrgOptions> {
  const out: OrgOptions = { districts: [], samithis: [] };
  if (!session.actor.permissions.has("org.read")) return out;
  const tree = await services().portal.org.tree(session.actor);
  const walk = (nodes: OrgTreeNode[], districtId: string | null) => {
    for (const n of nodes) {
      if (!n.active) continue;
      if (n.kind === "district") out.districts.push({ value: n.id, label: tx(n.name, locale) });
      if (n.kind === "samithi") out.samithis.push({ value: n.id, label: tx(n.name, locale), districtId: districtId ?? n.parentId ?? "" });
      walk(n.children, n.kind === "district" ? n.id : districtId);
    }
  };
  walk(tree, null);
  return out;
}
