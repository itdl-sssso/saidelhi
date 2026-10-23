// Form templates, versions and DEV form links shared by the mock repository and
// `pnpm db:seed`, so /f/<token> behaves the same on DATA_SOURCE=mock and db.
import { EVENT } from "../mock/fixtures/events";
import { fx } from "../mock/fixtures/ids";
import type { AllowedPhoneRec, FormVersionRec, LinkRec, TemplateRec } from "../repo/links-types";
import { encryptField } from "../security/crypto";
import { deriveLinkToken, hashLinkToken } from "../security/link-token";
import { maskPhone, phoneHash } from "../security/phone";
import { FORM_IDS, TEMPLATE_SEEDS } from "./definitions";

/** Fictional coordinator allowed on the seeded report links. */
export const DEV_COORDINATOR_PHONE = "+919000000001";

const PUBLISHED_AT = new Date("2026-10-01T00:00:00Z");

export function seedTemplates(): { templates: TemplateRec[]; versions: FormVersionRec[] } {
  return {
    templates: TEMPLATE_SEEDS.map((t) => ({
      id: t.id,
      code: t.code,
      sevaType: t.sevaType,
      purpose: t.purpose,
      titleEn: t.title.en,
      titleHi: t.title.hi,
      active: true,
    })),
    versions: TEMPLATE_SEEDS.map((t) => ({
      id: t.definition.id,
      templateId: t.id,
      version: t.definition.version,
      status: "published",
      definition: t.definition,
      publishedAt: PUBLISHED_AT,
    })),
  };
}

/** Report form locks for seeded events (eye/blood camps that have links). */
export const SEED_EVENT_FORM_LOCKS: Record<string, string> = {
  [EVENT.eyePlanned]: FORM_IDS.versions.eye,
  [EVENT.bloodPlanned]: FORM_IDS.versions.blood,
  [EVENT.eyeCamp]: FORM_IDS.versions.eye,
};

interface DevLinkPlan {
  key: string;
  eventId: string;
  purpose: LinkRec["purpose"];
  label: string;
  formVersionId: string;
  otpRequired: boolean;
  maxUses: number | null;
  uses: number;
  expiresAt: Date;
  revokedAt: Date | null;
  sentTo: "coordinator" | "qr" | null;
}

const EYE_EXPIRES = new Date("2026-12-13T18:29:59Z");
const BLOOD_EXPIRES = new Date("2026-11-22T18:29:59Z");

const PLANS: readonly DevLinkPlan[] = [
  { key: "eye-report", eventId: EVENT.eyePlanned, purpose: "report", label: "Report", formVersionId: FORM_IDS.versions.eye, otpRequired: true, maxUses: null, uses: 0, expiresAt: EYE_EXPIRES, revokedAt: null, sentTo: "coordinator" },
  { key: "eye-desk-1", eventId: EVENT.eyePlanned, purpose: "desk", label: "Desk 1 – Sector 31", formVersionId: FORM_IDS.versions.eye, otpRequired: true, maxUses: null, uses: 0, expiresAt: EYE_EXPIRES, revokedAt: null, sentTo: null },
  { key: "eye-desk-2", eventId: EVENT.eyePlanned, purpose: "desk", label: "Desk 2 – Sector 31", formVersionId: FORM_IDS.versions.eye, otpRequired: false, maxUses: null, uses: 0, expiresAt: EYE_EXPIRES, revokedAt: null, sentTo: "qr" },
  { key: "eye-public", eventId: EVENT.eyePlanned, purpose: "public", label: "Join this seva", formVersionId: FORM_IDS.versions.volunteer, otpRequired: false, maxUses: 50, uses: 0, expiresAt: new Date("2026-11-29T03:30:00Z"), revokedAt: null, sentTo: "qr" },
  { key: "eye-expired", eventId: EVENT.eyePlanned, purpose: "report", label: "Report (old)", formVersionId: FORM_IDS.versions.eye, otpRequired: true, maxUses: null, uses: 0, expiresAt: new Date("2026-10-01T18:29:59Z"), revokedAt: null, sentTo: "coordinator" },
  { key: "eye-revoked", eventId: EVENT.eyePlanned, purpose: "desk", label: "Desk 3 – Sector 31", formVersionId: FORM_IDS.versions.eye, otpRequired: true, maxUses: null, uses: 0, expiresAt: EYE_EXPIRES, revokedAt: new Date("2026-10-20T05:00:00Z"), sentTo: null },
  { key: "blood-report", eventId: EVENT.bloodPlanned, purpose: "report", label: "Report", formVersionId: FORM_IDS.versions.blood, otpRequired: true, maxUses: null, uses: 0, expiresAt: BLOOD_EXPIRES, revokedAt: null, sentTo: "coordinator" },
  { key: "blood-desk-1", eventId: EVENT.bloodPlanned, purpose: "desk", label: "Desk 1 – Karol Bagh", formVersionId: FORM_IDS.versions.blood, otpRequired: false, maxUses: null, uses: 0, expiresAt: BLOOD_EXPIRES, revokedAt: null, sentTo: "qr" },
  { key: "blood-public", eventId: EVENT.bloodPlanned, purpose: "public", label: "Join this seva", formVersionId: FORM_IDS.versions.volunteer, otpRequired: false, maxUses: 40, uses: 0, expiresAt: new Date("2026-11-08T04:30:00Z"), revokedAt: null, sentTo: "qr" },
  { key: "blood-used-up", eventId: EVENT.bloodPlanned, purpose: "public", label: "Join this seva (full)", formVersionId: FORM_IDS.versions.volunteer, otpRequired: false, maxUses: 1, uses: 1, expiresAt: new Date("2026-11-08T04:30:00Z"), revokedAt: null, sentTo: "qr" },
  { key: "narayan-overdue-report", eventId: EVENT.narayanMayurOverdue, purpose: "report", label: "Report", formVersionId: FORM_IDS.versions.eye, otpRequired: true, maxUses: null, uses: 0, expiresAt: new Date("2026-11-06T18:29:59Z"), revokedAt: null, sentTo: "coordinator" },
  { key: "medical-overdue-report", eventId: EVENT.medicalLaxmiOverdue, purpose: "report", label: "Report", formVersionId: FORM_IDS.versions.eye, otpRequired: true, maxUses: null, uses: 0, expiresAt: new Date("2026-11-06T18:29:59Z"), revokedAt: null, sentTo: "coordinator" },
];

export interface DevLink {
  key: string;
  token: string;
  rec: LinkRec;
}

/** Seeded links with their tokens (derived from the secret, so stable per environment). */
export function devLinks(secret: string): DevLink[] {
  const masked = maskPhone(DEV_COORDINATOR_PHONE);
  return PLANS.map((p, i) => {
    const nonce = `dev-${p.key}`;
    const token = deriveLinkToken(secret, nonce);
    const toPhone = p.sentTo === "coordinator";
    return {
      key: p.key,
      token,
      rec: {
        id: fx("LNK", i + 1),
        tokenHash: hashLinkToken(token),
        tokenNonce: nonce,
        eventId: p.eventId,
        purpose: p.purpose,
        label: p.label,
        formVersionId: p.formVersionId,
        sentToKind: toPhone ? "phone" : p.sentTo === "qr" ? "qr" : null,
        sentToEnc: toPhone ? encryptField(secret, DEV_COORDINATOR_PHONE) : null,
        sentToHash: toPhone ? phoneHash(secret, DEV_COORDINATOR_PHONE) : null,
        sentToMasked: toPhone ? masked : null,
        expiresAt: p.expiresAt,
        maxUses: p.maxUses,
        uses: p.uses,
        revokedAt: p.revokedAt,
        otpRequired: p.otpRequired,
        createdBy: null,
        lastOpenedAt: null,
        version: 1,
      },
    };
  });
}

export function devAllowedPhones(secret: string): AllowedPhoneRec[] {
  return [EVENT.eyePlanned, EVENT.bloodPlanned].map((eventId, i) => ({
    id: fx("LAP", i + 1),
    eventId,
    phoneHash: phoneHash(secret, DEV_COORDINATOR_PHONE),
    phoneEnc: encryptField(secret, DEV_COORDINATOR_PHONE),
    phoneMasked: maskPhone(DEV_COORDINATOR_PHONE),
    label: "Coordinator A",
  }));
}
