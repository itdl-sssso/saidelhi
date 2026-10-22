// Portal on the docker MySQL (pnpm db:migrate && pnpm db:seed); skipped when unreachable. Leaves no rows behind.
import { and, eq, gte } from "drizzle-orm";
import type { Pool } from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";
import { createDb, createPool } from "@/server/db/client";
import { auditLog, portalSession } from "@/server/db/tables";
import { EVENT, USER, devUserPhone } from "@/server/mock/fixtures";
import { DbRepo } from "@/server/repo/db";
import { createServices } from "@/server/services/create";
import { FakeWhatsApp, MemoryStorage } from "./support/links";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM app_user");
    if (Array.isArray(rows) && Number((rows[0] as { n: number }).n) > 0) return pool;
  } catch {
    // unreachable or M3 migration/seed not applied
  }
  await pool.end().catch(() => {});
  return null;
}

const pool = await probe();

describe.skipIf(!pool)("portal on MySQL (integration)", () => {
  const started = new Date(Date.now() - 1000);
  const db = pool ? createDb(pool) : null;
  const whatsapp = new FakeWhatsApp();
  const svc = db ? createServices(new DbRepo(db), { now: () => new Date(), mediaBase: "/media", whatsapp, storage: new MemoryStorage() }) : null;
  const rc = { requestId: "it", ipHash: null };

  afterAll(async () => {
    if (db) {
      await db.delete(portalSession).where(gte(portalSession.createdAt, started));
      await db.delete(auditLog).where(and(gte(auditLog.at, started), eq(auditLog.requestId, "it")));
    }
    await pool?.end();
  });

  it("signs in, sees only its district, and audits the sign-in", async () => {
    const s = svc!;
    await s.auth.requestOtp(devUserPhone(1), "whatsapp", "en");
    const { me, grant } = await s.auth.verify(devUserPhone(1), whatsapp.lastCode(), { ...rc, userAgent: null }, "en");
    expect(me.role).toBe("samithi_coord");
    const session = await s.auth.resolve(grant.token, rc);
    expect(session).not.toBeNull();
    const actor = session!.actor;
    await expect(s.portal.events.get(actor, EVENT.balVikasRohiniEscalated)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await s.portal.events.get(actor, EVENT.narayanMayurOverdue)).id).toBe(EVENT.narayanMayurOverdue);
    await expect(s.portal.audit.list(actor, { page: 1, pageSize: 5 } as never)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const officer = await s.auth.actorFor(USER.piiF, rc);
    const log = await s.portal.audit.list(officer!, { page: 1, pageSize: 10 } as never);
    expect(log.data.some((e) => e.action === "auth.sign_in")).toBe(true);
    await s.auth.logout(grant.token, rc);
    expect(await s.auth.resolve(grant.token, rc)).toBeNull();
  });
});
