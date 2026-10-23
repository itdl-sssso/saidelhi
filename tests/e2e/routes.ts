import { ValueSlug } from "../../src/contract/enums";
import type { E2EData } from "./helpers";

export type RouteDef = { path: string; area: "public" | "admin" };

export function publicRoutes(d: E2EData): RouteDef[] {
  const p = [
    "/",
    "/about",
    "/calendar",
    "/centres/map",
    "/impact",
    "/join",
    "/news",
    "/privacy",
    "/programs",
    `/programs/${d.programType}`,
    `/events/${d.eventId}`,
    `/centres/${d.centreSlug}`,
    `/news/${d.articleSlug}`,
    `/districts/${d.districtSlug}`,
    ...ValueSlug.options.map((v) => `/values/${v}`),
  ];
  return p.map((path) => ({ path, area: "public" }));
}

/** All /admin pages (state admin). Detail pages use ids resolved by global-setup. */
export function adminRoutes(d: E2EData): RouteDef[] {
  const a = d.admin ?? {};
  const list = [
    "/admin",
    "/admin/approvals",
    "/admin/audit",
    "/admin/centres",
    a.centreId && `/admin/centres/${a.centreId}`,
    "/admin/content",
    a.contentId && `/admin/content/${a.contentId}`,
    "/admin/content/thoughts",
    "/admin/discourses",
    "/admin/events",
    "/admin/events/new",
    a.eventId && `/admin/events/${a.eventId}`,
    a.eventId && `/admin/events/${a.eventId}/edit`,
    "/admin/follow-up",
    "/admin/forms",
    a.formId && `/admin/forms/${a.formId}/edit`,
    "/admin/health",
    "/admin/impact",
    "/admin/inbox",
    a.inboxId && `/admin/inbox/${a.inboxId}`,
    "/admin/links",
    "/admin/migration",
    "/admin/org",
    "/admin/partners",
    "/admin/people",
    "/admin/privacy",
    "/admin/reports",
    "/admin/settings",
    "/admin/uploads",
    "/admin/uploads/new",
    "/admin/volunteers",
    "/admin/whatsapp",
  ].filter((x): x is string => !!x);
  return list.map((path) => ({ path, area: "admin" }));
}

export function formRoutes(d: E2EData): { key: string; path: string; needsSession: boolean }[] {
  const t = d.tokens["eye-report"]!;
  return [
    { key: "report", path: `/f/${t}`, needsSession: false },
    { key: "report-form", path: `/f/${t}/form`, needsSession: true },
    { key: "report-done", path: `/f/${t}/done`, needsSession: true },
    { key: "expired", path: `/f/${d.tokens["eye-expired"]}`, needsSession: false },
    { key: "public", path: `/f/${d.tokens["eye-public"]}`, needsSession: false },
  ];
}
