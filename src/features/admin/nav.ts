// Portal navigation (spec 24 shell). Items a role lacks the permission for are hidden, never disabled.
import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/contract";
import * as I from "./icons";

export type NavGroupId = "operate" | "collect" | "org" | "publish" | "comms" | "govern";

export type NavItemId =
  | "overview" | "events" | "inbox" | "approvals" | "links" | "forms" | "uploads" | "volunteers" | "org" | "centres" | "partners" | "people"
  | "content" | "impact" | "discourses" | "whatsapp" | "reports" | "health" | "followup" | "privacy" | "audit" | "migration" | "settings";

export interface NavItemDef {
  id: NavItemId;
  href: string;
  icon: LucideIcon;
  permission: Permission;
  /** Any of these also shows the item (e.g. district coordinators get WhatsApp reminders only). */
  alsoFor?: Permission[];
  /** Lock glyph: restricted screens (personal data). */
  restricted?: boolean;
  /** Built in this milestone; the rest show a placeholder page. */
  built?: boolean;
}

export const NAV: Array<{ id: NavGroupId; items: NavItemDef[] }> = [
  {
    id: "operate",
    items: [
      { id: "overview", href: "/admin", icon: I.LayoutDashboard, permission: "overview.read", built: true },
      { id: "events", href: "/admin/events", icon: I.CalendarPlus, permission: "events.read", built: true },
      { id: "inbox", href: "/admin/inbox", icon: I.Inbox, permission: "inbox.review", built: true },
      { id: "approvals", href: "/admin/approvals", icon: I.CheckCheck, permission: "approvals.read", built: true },
    ],
  },
  {
    id: "collect",
    items: [
      { id: "links", href: "/admin/links", icon: I.Link2, permission: "links.read", built: true },
      { id: "forms", href: "/admin/forms", icon: I.FileText, permission: "forms.read", built: true },
      { id: "uploads", href: "/admin/uploads", icon: I.Upload, permission: "uploads.manage", built: true },
      { id: "volunteers", href: "/admin/sevadal", icon: I.Users, permission: "volunteers.read", built: true },
    ],
  },
  {
    id: "org",
    items: [
      { id: "org", href: "/admin/org", icon: I.Network, permission: "org.manage", built: true },
      { id: "centres", href: "/admin/centres", icon: I.MapPin, permission: "centres.manage", built: true },
      { id: "partners", href: "/admin/partners", icon: I.Handshake, permission: "partners.manage", built: true },
      { id: "people", href: "/admin/people", icon: I.UserCog, permission: "people.read", built: true },
    ],
  },
  {
    id: "publish",
    items: [
      { id: "content", href: "/admin/content", icon: I.Newspaper, permission: "content.edit" },
      { id: "impact", href: "/admin/impact", icon: I.ChartColumn, permission: "impact.manage" },
      { id: "discourses", href: "/admin/discourses", icon: I.BookOpen, permission: "discourses.edit" },
    ],
  },
  {
    id: "comms",
    items: [
      { id: "whatsapp", href: "/admin/whatsapp", icon: I.MessageCircle, permission: "whatsapp.manage", alsoFor: ["whatsapp.reminders"], built: true },
      { id: "reports", href: "/admin/reports", icon: I.Download, permission: "reports.export" },
    ],
  },
  {
    id: "govern",
    items: [
      { id: "health", href: "/admin/health", icon: I.Activity, permission: "health.read" },
      { id: "followup", href: "/admin/follow-up", icon: I.HeartPulse, permission: "followup.read", restricted: true },
      { id: "privacy", href: "/admin/privacy", icon: I.Shield, permission: "privacy.read", alsoFor: ["privacy.manage"], restricted: true },
      { id: "audit", href: "/admin/audit", icon: I.ScrollText, permission: "audit.read", built: true },
      { id: "migration", href: "/admin/migration", icon: I.ArrowRightLeft, permission: "migration.run" },
      { id: "settings", href: "/admin/settings", icon: I.Settings, permission: "settings.manage", built: true },
    ],
  },
];

export const ALL_ITEMS: NavItemDef[] = NAV.flatMap((g) => g.items);

/** Groups and items visible to a permission set. */
export function navFor(perms: ReadonlySet<Permission> | readonly Permission[]) {
  const has = (p: Permission) => (perms instanceof Set ? perms.has(p) : (perms as readonly Permission[]).includes(p));
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => has(i.permission) || i.alsoFor?.some(has)) })).filter((g) => g.items.length);
}

export function firstAllowedHref(perms: readonly Permission[]): string | null {
  return navFor(perms)[0]?.items[0]?.href ?? null;
}

/** Placeholder section slug → nav item id (the route segment is the href tail). */
export const SECTION_BY_SLUG: Record<string, NavItemDef> = Object.fromEntries(ALL_ITEMS.map((i) => [i.href.replace("/admin/", ""), i]));

/** Items shown in the phone tab bar, in this order, if the role can use them. */
export const TAB_ORDER = ["overview", "events", "approvals", "links", "inbox"] as const satisfies readonly NavItemId[];

export const isActive = (href: string, pathname: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
