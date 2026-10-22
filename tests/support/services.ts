import { MockRepo } from "@/server/repo/mock";
import { createServices } from "@/server/services/create";

/** 22 Oct 2026, 13:30 IST — after the 17 Oct eye camp, before the November events. */
export const NOW = new Date("2026-10-22T08:00:00Z");

export function mockServices(now: Date = NOW) {
  const repo = new MockRepo();
  return { repo, svc: createServices(repo, { now: () => now, mediaBase: "/media" }) };
}
