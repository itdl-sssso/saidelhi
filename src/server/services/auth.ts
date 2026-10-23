// Portal sign-in (§5.3): WhatsApp/email OTP, DB sessions with 7-day sliding
// expiry, and the Actor (role + scope + permissions) behind every portal call.
import { type Me, type OtpChannel, type OtpSent, type Locale, PORTAL_SESSION_DAYS } from "@/contract";
import { auditRec } from "../audit";
import { type Actor, permissionsFor, type RequestContext } from "../auth/rbac";
import { ApiError } from "../http/errors";
import type { RoleAssignmentRec, SessionRec, UserRec } from "../repo/portal-types";
import { sha256Hex } from "../security/crypto";
import { csrfFor, newSessionToken } from "../security/link-token";
import { normalisePhone, phoneHash } from "../security/phone";
import { i18n } from "./org-index";
import { otpPolicy, sendOtp, verifyOtp } from "./otp";
import { loadOrg } from "./shared";
import type { PortalCtx } from "./portal/shared";

export const SESSION_TTL_MS = PORTAL_SESSION_DAYS * 24 * 60 * 60 * 1000;
/** Sessions are renewed (DB + cookie) at most this often. */
const RENEW_EVERY_MS = 5 * 60 * 1000;
const NCR_ROLES = new Set(["state_admin", "content_editor", "pii_officer"]);

const MSG = {
  phone: { en: "Enter a 10-digit mobile number.", hi: "10 अंकों का मोबाइल नंबर लिखें।" },
  wrong: { en: "That code is not right.", hi: "यह कोड सही नहीं है।" },
} as const;

export const sessionIdFor = (token: string) => sha256Hex(`sid:${token}`);

/** What the route sets as cookies: `sid` (httpOnly) and `csrf` (readable). */
export interface PortalGrant {
  token: string;
  csrf: string;
  maxAgeSeconds: number;
}

export interface ResolvedSession {
  sessionId: string;
  actor: Actor;
  user: UserRec;
  /** Set when the sliding expiry moved: re-send the cookies. */
  renewed: PortalGrant | null;
}

export interface ClientMeta {
  ipHash: string | null;
  userAgent: string | null;
}

export interface AuthService {
  requestOtp(phone: string, channel: OtpChannel, locale: Locale): Promise<OtpSent>;
  verify(phone: string, code: string, meta: ClientMeta & RequestContext, locale: Locale): Promise<{ me: Me; grant: PortalGrant }>;
  /** null when the token is unknown, expired, revoked, or the person is no longer active. */
  resolve(token: string, ctx: RequestContext): Promise<ResolvedSession | null>;
  logout(token: string, ctx: RequestContext): Promise<void>;
  me(actor: Actor): Promise<Me>;
  /** Actor for a user id (jobs/tests); null when inactive. */
  actorFor(userId: string, ctx?: RequestContext): Promise<Actor | null>;
}

export function createAuthService(ctx: PortalCtx): AuthService {
  const { repo, deps } = ctx;
  const now = () => deps.now();
  const otpDeps = { repo: repo.links, whatsapp: deps.whatsapp, secret: deps.secret, now, policy: () => otpPolicy(repo) };

  const grantFor = (token: string): PortalGrant => ({ token, csrf: csrfFor(deps.secret, token), maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000) });

  async function buildActor(user: UserRec, role: RoleAssignmentRec, rc: RequestContext): Promise<Actor> {
    const all = NCR_ROLES.has(role.role);
    const unitIds = !all && role.scopeId ? await repo.portal.descendantIds(role.scopeId) : [];
    return {
      userId: user.id,
      name: user.name,
      role: role.role,
      scopeId: role.scopeId,
      all,
      unitIds: new Set(unitIds),
      permissions: new Set(permissionsFor(role.role)),
      ctx: rc,
    };
  }

  async function activeUser(userId: string): Promise<{ user: UserRec; role: RoleAssignmentRec } | null> {
    const [user, role] = await Promise.all([repo.portal.userById(userId), repo.portal.currentRole(userId)]);
    if (!user || !role || user.status === "deactivated") return null;
    return { user, role };
  }

  function parsePhone(raw: string, locale: Locale) {
    const e164 = normalisePhone(raw);
    if (!e164) throw new ApiError("VALIDATION_FAILED", { fields: { phone: MSG.phone[locale] } });
    return { e164, hash: phoneHash(deps.secret, e164) };
  }

  async function me(actor: Actor): Promise<Me> {
    const [user, org] = await Promise.all([repo.portal.userById(actor.userId), loadOrg(repo)]);
    if (!user) throw new ApiError("UNAUTHENTICATED");
    const unit = actor.scopeId ? org.get(actor.scopeId) : undefined;
    return {
      user: { id: user.id, name: user.name, phone: user.phoneMasked, email: user.email, locale: user.locale },
      role: actor.role,
      scope: unit ? { id: unit.id, slug: unit.slug, name: i18n(unit.nameEn, unit.nameHi), kind: unit.kind } : null,
      permissions: [...actor.permissions],
    };
  }

  return {
    async requestOtp(rawPhone, channel, locale) {
      const phone = parsePhone(rawPhone, locale);
      const user = await repo.portal.userByPhoneHash(phone.hash);
      const known = user && user.status !== "deactivated" && (await repo.portal.currentRole(user.id)) ? user : null;
      let deliver: (code: string) => Promise<unknown>;
      if (known && channel === "whatsapp") {
        deliver = (code) => deps.whatsapp.sendTemplate(phone.e164, "login_code", known.locale, [code]);
      } else if (known?.email && channel === "email") {
        const to = known.email;
        deliver = (code) =>
          deps.email.send({
            to,
            subject: known.locale === "hi" ? "आपका साइन-इन कोड" : "Your sign-in code",
            text: known.locale === "hi" ? `आपका कोड ${code} है। यह 5 मिनट में समाप्त हो जाएगा।` : `Your code is ${code}. It expires in 5 minutes. Never share it.`,
          });
      } else {
        // Unknown numbers (or no email on file) get a challenge that is never sent: same answer, same throttling.
        deliver = async () => undefined;
      }
      return sendOtp(otpDeps, { phone: phone.e164, phoneHash: phone.hash, purpose: "login", linkId: null }, locale, deliver);
    },

    async verify(rawPhone, code, meta, locale) {
      const phone = parsePhone(rawPhone, locale);
      await verifyOtp(otpDeps, { phoneHash: phone.hash, purpose: "login", linkId: null }, code, locale);
      const user = await repo.portal.userByPhoneHash(phone.hash);
      const found = user ? await activeUser(user.id) : null;
      if (!found) throw new ApiError("VALIDATION_FAILED", { fields: { code: MSG.wrong[locale] } });

      const at = now();
      const token = newSessionToken();
      const rec: SessionRec = {
        id: sessionIdFor(token),
        userId: found.user.id,
        createdAt: at,
        lastSeenAt: at,
        expiresAt: new Date(at.getTime() + SESSION_TTL_MS),
        revokedAt: null,
        ipHash: meta.ipHash,
        uaHint: meta.userAgent ? meta.userAgent.slice(0, 160) : null,
      };
      await repo.portal.insertSession(rec);
      const actor = await buildActor(found.user, found.role, meta);
      await repo.portal.updateUser({
        userId: found.user.id,
        patch: { lastSignInAt: at, ...(found.user.status === "invited" ? { status: "active" as const } : {}) },
        audit: [auditRec(actor, { action: "auth.sign_in", entity: "user", entityId: found.user.id, scopeId: found.role.scopeId, data: { firstSignIn: found.user.status === "invited" } })],
      });
      return { me: await me(actor), grant: grantFor(token) };
    },

    async resolve(token, rc) {
      if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
      const id = sessionIdFor(token);
      const s = await repo.portal.sessionById(id);
      const at = now();
      if (!s || s.revokedAt || s.expiresAt <= at) return null;
      const found = await activeUser(s.userId);
      if (!found) return null;
      let renewed: PortalGrant | null = null;
      if (at.getTime() - s.lastSeenAt.getTime() >= RENEW_EVERY_MS) {
        await repo.portal.touchSession(id, at, new Date(at.getTime() + SESSION_TTL_MS));
        renewed = grantFor(token);
      }
      return { sessionId: id, actor: await buildActor(found.user, found.role, rc), user: found.user, renewed };
    },

    async logout(token, rc) {
      const id = sessionIdFor(token);
      const s = await repo.portal.sessionById(id);
      if (!s || s.revokedAt) return;
      await repo.portal.revokeSession(id, now());
      const found = await activeUser(s.userId);
      const by = found ? await buildActor(found.user, found.role, rc) : { kind: "system" as const, requestId: rc.requestId };
      await repo.portal.insertAudit(auditRec(by, { action: "auth.sign_out", entity: "user", entityId: s.userId, scopeId: found?.role.scopeId ?? null }));
    },

    me,

    async actorFor(userId, rc = { requestId: null, ipHash: null }) {
      const found = await activeUser(userId);
      return found ? buildActor(found.user, found.role, rc) : null;
    },
  };
}
