// M6 test harness: mock repo + services + actors by seeded user.
import { ApiError } from "@/server/http/errors";
import { MockRepo } from "@/server/repo/mock";
import { createServices } from "@/server/services/create";
import { FakeWhatsApp, MemoryStorage } from "./links";
import { NOW } from "./services";

export function m6Setup(now: Date = NOW) {
  const repo = new MockRepo();
  const whatsapp = new FakeWhatsApp();
  const clock = { t: now };
  const storage = new MemoryStorage();
  const publicMedia = new MemoryStorage();
  const svc = createServices(repo, { now: () => clock.t, mediaBase: "/media", whatsapp, storage, publicMedia });
  const rc = { requestId: "t", ipHash: null };
  const actor = async (userId: string) => (await svc.auth.actorFor(userId, rc))!;
  return { repo, svc, whatsapp, storage, publicMedia, clock, actor, rc };
}

import type { FormField } from "@/contract";

/** A complete number question (the contract requires every key). */
export const numField = (id: string, en: string, hi: string | null): FormField => ({
  id,
  kind: "number",
  label: { en, hi },
  help: null,
  required: false,
  min: 0,
  max: 100,
  kpi: null,
  locked: false,
  personal: false,
});

export const errCode = async (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof ApiError ? e.code : `other:${String(e)}`));

export async function apiErr(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error("expected ApiError");
}
