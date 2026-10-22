import "server-only";
import { getDb } from "../db/client";
import { revalidatePublic } from "../cache";
import { appSecret, env } from "../env";
import { DiskStorage } from "../files";
import { whatsapp } from "../providers/whatsapp";
import { DbRepo } from "../repo/db";
import { MockRepo } from "../repo/mock";
import type { DataRepo } from "../repo/types";
import { createServices } from "./create";
import type { Services } from "./types";

export type * from "./types";

// Module-level (not globalThis) so dev HMR picks up service changes; the DB pool
// itself is the HMR-safe singleton.
let cached: Services | undefined;

function createRepo(): DataRepo {
  return env().DATA_SOURCE === "db" ? new DbRepo(getDb()) : new MockRepo(undefined, appSecret());
}

/**
 * The service layer for the current DATA_SOURCE. Server Components call this
 * directly; route handlers wrap the same calls in API envelopes.
 */
export function services(): Services {
  cached ??= createServices(createRepo(), {
    now: () => new Date(),
    mediaBase: env().MEDIA_URL,
    secret: appSecret(),
    whatsapp: whatsapp(),
    storage: new DiskStorage(env().MEDIA_PRIVATE_ROOT),
    appUrl: env().APP_URL,
    revalidate: revalidatePublic,
  });
  return cached;
}
