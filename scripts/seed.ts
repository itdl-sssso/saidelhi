/**
 * Seeds the dev database with the same fixtures the mock data source serves
 * (src/server/mock/fixtures). Idempotent: clears our own tables first.
 * Never touches legacy tables except one clearly fictional sample article
 * (id 900001) linked to the sample eye camp.
 *
 *   pnpm db:seed            (after db:migrate, and after db:import-legacy)
 */
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/server/db/client";
import { postcontentPostcontent } from "../src/server/db/legacy";
import {
  articleI18n,
  centre,
  centreGathering,
  contentItem,
  event,
  eventTimeline,
  impactEstimate,
  orgClosure,
  orgUnit,
  partner,
  setting,
  sevaType,
  submissionAnswerKpi,
} from "../src/server/db/tables";
import { fx, loadFixtures, SAMPLE_ARTICLE_ID } from "../src/server/mock/fixtures";
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

  await db.transaction(async (tx) => {
    await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    for (const t of [articleI18n, submissionAnswerKpi, eventTimeline, impactEstimate, event, centreGathering, centre, partner, orgClosure, orgUnit, sevaType, contentItem, setting]) {
      await tx.delete(t);
    }
    await tx.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

    await tx.insert(orgUnit).values(f.orgUnits);
    await tx.insert(orgClosure).values(closure(f.orgUnits));
    await tx.insert(sevaType).values(f.sevaTypes.map((s, i) => ({ id: fx("SVT", i + 1), ...s })));
    await tx.insert(partner).values(f.partners);
    await tx.insert(centre).values(f.centres);
    await tx.insert(centreGathering).values(f.gatherings);
    await tx.insert(event).values(f.events);
    await tx.insert(eventTimeline).values(f.timeline);
    await tx.insert(submissionAnswerKpi).values(f.kpiFacts);
    await tx.insert(impactEstimate).values(f.estimates);
    await tx.insert(contentItem).values(f.contentItems);
    await tx.insert(setting).values(Object.entries(f.settings).map(([key, value]) => ({ key, value })));

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
  console.log("Seeded:", counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
