// Portal auth (§5.3) and role-based permissions (§3).
import { z } from "zod";
import { OrgUnitKind, Role } from "./enums";
import { Id, Locale, MaskedPhone, UnitRef } from "./primitives";

/** Every portal capability. Frontend hides nav/actions without the permission; backend re-checks. */
export const Permission = z.enum([
  "overview.read",
  "events.read",
  "events.plan",
  "events.approve",
  "events.reopen",
  "links.read",
  "links.manage",
  "approvals.read",
  "approvals.decide",
  "approvals.escalated",
  "inbox.review",
  /** v0.7: view templates + request changes (district). */
  "forms.read",
  "forms.manage",
  "uploads.manage",
  "org.read",
  "org.manage",
  "centres.manage",
  "partners.manage",
  "people.read",
  "people.invite",
  "people.manage",
  "content.edit",
  /** v0.10: add/rename/reorder/deactivate article types (state admin). */
  "content.types",
  "impact.manage",
  "discourses.edit",
  /** v0.8: approve paragraphs/discourses, assign reviewers. */
  "discourses.review",
  /** v0.8: publish/unpublish (also needs flag `discourses` on). */
  "discourses.publish",
  "migration.run",
  "whatsapp.manage",
  "whatsapp.reminders",
  "volunteers.read",
  "reports.export",
  "health.read",
  "followup.read",
  "followup.reveal",
  /** v0.7: read-only privacy tabs (state admin; spec 47). */
  "privacy.read",
  "privacy.manage",
  "audit.read",
  "settings.manage",
  "attachments.read",
  /** v0.9.5: send/upload gallery photos (they land pending). */
  "gallery.upload",
  /** v0.9.5: approve/edit/reject photos, publish albums. */
  "gallery.review",
]);
export type Permission = z.infer<typeof Permission>;
export const PERMISSIONS = Permission.options;

/** An org unit with its kind (scope switcher, people scope, overview scope). */
export const ScopeRef = UnitRef.extend({ kind: OrgUnitKind });
export type ScopeRef = z.infer<typeof ScopeRef>;

/** GET /auth/me, POST /auth/verify. */
export const Me = z.object({
  user: z.object({ id: Id, name: z.string(), phone: MaskedPhone, email: z.string().nullable(), locale: Locale }),
  role: Role,
  /** null for roles without an org scope (translator). */
  scope: ScopeRef.nullable(),
  permissions: z.array(Permission),
});
export type Me = z.infer<typeof Me>;

export const OtpChannel = z.enum(["whatsapp", "email"]);
export type OtpChannel = z.infer<typeof OtpChannel>;

/** POST /auth/otp → 202 `OtpSent` (same answer for unknown numbers). */
export const AuthOtpRequest = z.object({
  phone: z.string().trim().min(8).max(20),
  channel: OtpChannel.default("whatsapp"),
});
export type AuthOtpRequest = z.input<typeof AuthOtpRequest>;

/** POST /auth/verify → `Me` + `sid`/`csrf` cookies. */
export const AuthVerifyRequest = z.object({
  phone: z.string().trim().min(8).max(20),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type AuthVerifyRequest = z.infer<typeof AuthVerifyRequest>;

/** Portal session cookies: `sid` (httpOnly) and `csrf` (readable; echo it as `x-csrf` on mutations). */
export const PORTAL_COOKIES = { session: "sid", csrf: "csrf" } as const;
export const PORTAL_HEADERS = { csrf: "x-csrf" } as const;
/** Sliding session lifetime. */
export const PORTAL_SESSION_DAYS = 7;
