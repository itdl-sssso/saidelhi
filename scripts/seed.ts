/**
 * Seeds the dev database with the same fixtures the mock data source serves
 * (src/server/mock/fixtures). Idempotent: clears our own tables first.
 * Never touches legacy tables except one clearly fictional sample article
 * (id 900001) linked to the sample eye camp.
 *
 *   pnpm db:seed            (after db:migrate, and after db:import-legacy)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { logPolish, polishLegacy } from "./legacy-polish";
import { runImport as importDiscourses } from "./import-discourses";
import { closeDb, getDb } from "../src/server/db/client";
import { postcontentPostcontent } from "../src/server/db/legacy";
import {
  appUser,
  approval,
  articleI18n,
  attachment,
  auditLog,
  portalSession,
  roleAssignment,
  consentRecord,
  formLink,
  formTemplate,
  formVersion,
  linkAllowedPhone,
  linkSession,
  otpChallenge,
  submission,
  centre,
  centreGathering,
  contentItem,
  event,
  eventTimeline,
  impactEstimate,
  inboxHistory,
  inboxItem,
  orgClosure,
  orgUnit,
  partner,
  reminderRule,
  setting,
  sevaType,
  submissionAnswerKpi,
  whatsappConversation,
  whatsappMessage,
  whatsappOptin,
  whatsappTemplate,
} from "../src/server/db/tables";
import { M6_DOC_TABLES } from "../src/server/db/schema/m6";
import { appSecret, env } from "../src/server/env";
import { lintDefinition } from "../src/contract";
import { DEV_COORDINATOR_PHONE, devAllowedPhones, devLinks, SEED_EVENT_FORM_LOCKS, seedTemplates } from "../src/server/forms/seed-data";
import { devUserPhone, fx, loadFixtures, portalFixtures, SAMPLE_ARTICLE_ID, waFixtures } from "../src/server/mock/fixtures";
import type { OrgUnitRec } from "../src/server/repo/types";

function closure(units: readonly OrgUnitRec[]) {
  const byId = new Map(units.map((u) => [u.id, u]));
  const rows: { ancestorId: string; descendantId: string; depth: number }[] = [];
  for (const u of units) {
    let cur: OrgUnitRec | undefined = u;
    let depth = 0;
    while (cur) {
      rows.push({ ancestorId: cur.id, descendantId: u.id, depth });
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      depth++;
    }
  }
  return rows;
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    throw new Error("Refusing to seed with NODE_ENV=production (pass --force if you really mean it).");
  }
  const db = getDb();
  const f = loadFixtures();
  const secret = appSecret();
  const forms = seedTemplates();
  for (const v of forms.versions) {
    const problems = lintDefinition(v.definition);
    if (problems.length) throw new Error(`Form ${v.id} is invalid:\n  ${problems.join("\n  ")}`);
  }
  const links = devLinks(secret);
  const portal = portalFixtures(secret);
  const wa = waFixtures(secret);

  await db.transaction(async (tx) => {
    await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    for (const t of [consentRecord, attachment, submission, linkSession, otpChallenge, linkAllowedPhone, formLink, formVersion, formTemplate]) {
      await tx.delete(t);
    }
    for (const t of [inboxHistory, inboxItem, whatsappMessage, whatsappConversation, whatsappOptin, whatsappTemplate, reminderRule]) {
      await tx.delete(t);
    }
    for (const t of [approval, portalSession, roleAssignment, appUser, auditLog, articleI18n, submissionAnswerKpi, eventTimeline, impactEstimate, event, centreGathering, centre, partner, orgClosure, orgUnit, sevaType, contentItem, setting]) {
      await tx.delete(t);
    }
    for (const t of Object.values(M6_DOC_TABLES)) await tx.delete(t);
    await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

    await tx.insert(orgUnit).values(f.orgUnits);
    await tx.insert(appUser).values(portal.users);
    await tx.insert(roleAssignment).values(portal.roles);
    await tx.insert(orgClosure).values(closure(f.orgUnits));
    await tx.insert(sevaType).values(f.sevaTypes.map((s, i) => ({ id: fx("SVT", i + 1), ...s })));
    await tx.insert(partner).values(f.partners);
    await tx.insert(centre).values(f.centres);
    await tx.insert(centreGathering).values(f.gatherings);
    await tx.insert(event).values(f.events);
    await tx.insert(eventTimeline).values(f.timeline);
    await tx.insert(approval).values(portal.approvals);
    await tx.insert(submissionAnswerKpi).values(f.kpiFacts);
    await tx.insert(impactEstimate).values(f.estimates);
    await tx.insert(contentItem).values(f.contentItems);
    await tx.insert(setting).values(Object.entries(f.settings).map(([key, value]) => ({ key, value })));

    await tx.insert(formTemplate).values(forms.templates);
    await tx.insert(formVersion).values(forms.versions);
    for (const [eventId, formVersionId] of Object.entries(SEED_EVENT_FORM_LOCKS)) {
      await tx.update(event).set({ formVersionId }).where(eq(event.id, eventId));
    }
    await tx.insert(formLink).values(links.map((l) => l.rec));
    await tx.insert(linkAllowedPhone).values(devAllowedPhones(secret));

    await tx.insert(whatsappTemplate).values(wa.templates);
    await tx.insert(reminderRule).values(
      wa.rules.map((r) => ({ id: r.id, key: r.key, labelEn: r.label.en, labelHi: r.label.hi, descriptionEn: r.description.en, descriptionHi: r.description.hi, enabled: r.enabled, copyDistrict: r.copyDistrict })),
    );
    await tx.insert(whatsappConversation).values(wa.conversations);
    await tx.insert(inboxItem).values(wa.inbox);
    await tx.insert(inboxHistory).values(wa.history);
    await tx.insert(whatsappMessage).values(wa.messages);
    await tx.insert(whatsappOptin).values(wa.optIns);

    const sample = f.articles.find((a) => a.id === SAMPLE_ARTICLE_ID);
    if (sample) {
      const row = {
        id: sample.id,
        title: sample.title,
        slug: sample.slug,
        category: sample.category,
        shortDescription: sample.shortDescription,
        content: sample.content,
        featuredImage: sample.featuredImage,
        createdAt: sample.createdAt,
        updatedAt: sample.updatedAt,
      };
      await tx.insert(postcontentPostcontent).values(row).onDuplicateKeyUpdate({ set: row });
      if (sample.i18n) await tx.insert(articleI18n).values(sample.i18n);
    }
  });

  const counts = {
    org_unit: f.orgUnits.length,
    centre: f.centres.length,
    centre_gathering: f.gatherings.length,
    event: f.events.length,
    submission_answer_kpi: f.kpiFacts.length,
    impact_estimate: f.estimates.length,
    content_item: f.contentItems.length,
    setting: Object.keys(f.settings).length,
  };
  console.log("Seeded:", {
    ...counts,
    form_template: forms.templates.length,
    form_link: links.length,
    inbox_item: wa.inbox.length,
    whatsapp_conversation: wa.conversations.length,
    whatsapp_message: wa.messages.length,
    whatsapp_optin: wa.optIns.length,
  });

  // Legacy posts (if imported) get district tags now that the districts exist.
  const url = env().DATABASE_URL;
  if (url) {
    const conn = await mysql.createConnection({ uri: url, timezone: "Z", charset: "utf8mb4" });
    try {
      logPolish(await polishLegacy(conn));
    } finally {
      await conn.end();
    }
  }

  // Placeholder register photo for the seeded inbox item (a 1x1 PNG; the real ones come from WhatsApp).
  const photo = path.resolve(env().MEDIA_PRIVATE_ROOT, "inbox", "seed-register.png");
  await mkdir(path.dirname(photo), { recursive: true });
  await writeFile(
    photo,
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
  );

  if (env().NODE_ENV !== "production") {
    const base = env().APP_URL.replace(/\/$/, "");
    console.log(`\nDEV form links (tokens derive from SESSION_SECRET; coordinator phone ${DEV_COORDINATOR_PHONE}, OTP codes print in the server log):`);
    for (const l of links) console.log(`  ${l.key.padEnd(14)} ${l.rec.purpose.padEnd(7)} ${base}/f/${l.token}`);
    console.log("\nDEV WhatsApp bot: POST /api/v1/dev/whatsapp/inbound { from, text, replyId, media }; try +91 90000 00001 (coordinator, hi), 00002 (district), 00003 (state admin), +91 98765 43210 (public).");
    // Discourses (M7): import the offline translations (if present) and publish 3 samples; the flag follows NODE_ENV (on in dev).
    await importDiscourses({ publish: 3 }).catch((e) => console.warn("discourse import skipped:", e instanceof Error ? e.message : e));
    console.log("\nDEV portal logins (OTP prints in the server log):");
    const byId = new Map(portal.users.map((u) => [u.id, u]));
    for (const [i, r] of portal.roles.entries()) {
      const u = byId.get(r.userId)!;
      const num = (i + 1) % 10;
      console.log(`  ${devUserPhone(num).padEnd(15)} ${r.role.padEnd(14)} ${u.name} [${u.status}]`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
