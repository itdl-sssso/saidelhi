// M6 test harness: mock repo + services + actors by seeded user.
import { ApiError } from "@/server/http/errors";
import { MockRepo } from "@/server/repo/mock";
import { createServices } from "@/server/services/create";
import { FakeWhatsApp } from "./links";
import { NOW } from "./services";

export function m6Setup(now: Date = NOW) {
  const repo = new MockRepo();
  const whatsapp = new FakeWhatsApp();
  const clock = { t: now };
  const svc = createServices(repo, { now: () => clock.t, mediaBase: "/media", whatsapp });
  const rc = { requestId: "t", ipHash: null };
  const actor = async (userId: string) => (await svc.auth.actorFor(userId, rc))!;
  return { repo, svc, whatsapp, clock, actor, rc };
}

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
