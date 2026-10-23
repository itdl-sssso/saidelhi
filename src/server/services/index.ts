import "server-only";
import { getDb } from "../db/client";
import { revalidatePublic } from "../cache";
import { appSecret, env } from "../env";
import { DiskStorage } from "../files";
import { email } from "../providers/email";
import { createExtractor } from "../ai";
import { LoggedWhatsApp, whatsapp } from "../providers/whatsapp";
import { DbRepo } from "../repo/db";
import { MockRepo } from "../repo/mock";
import type { DataRepo } from "../repo/types";
import { createServices } from "./create";
import type { Services } from "./types";

export type * from "./types";

// Module-level (not globalThis) so dev HMR picks up service changes; the DB pool
// itself is the HMR-safe singleton.
/** Obviously fake number so /join shows the full UI in dev; production shows "coming soon" until configured. */
const DEV_PLACEHOLDER_NUMBER = "+91 98100 00000";

let cached: Services | undefined;

function createRepo(): DataRepo {
  return env().DATA_SOURCE === "db" ? new DbRepo(getDb()) : new MockRepo(undefined, appSecret());
}

/**
 * The service layer for the current DATA_SOURCE. Server Components call this
 * directly; route handlers wrap the same calls in API envelopes.
 */
export function services(): Services {
  if (cached) return cached;
  const repo = createRepo();
  const e = env();
  const now = () => new Date();
  cached = createServices(repo, {
    now,
    mediaBase: env().MEDIA_URL,
    secret: appSecret(),
    // Every outbound message is stored (admin log, dev simulator).
    whatsapp: new LoggedWhatsApp(whatsapp(), repo.wa, { secret: appSecret(), now }),
    extractor: createExtractor(e.EXTRACTOR_PROVIDER, { url: e.OLLAMA_URL, model: e.OLLAMA_MODEL }),
    email: email(),
    storage: new DiskStorage(env().MEDIA_PRIVATE_ROOT),
    publicMedia: new DiskStorage(env().MEDIA_ROOT),
    appUrl: env().APP_URL,
    revalidate: revalidatePublic,
    whatsappPublic: {
      number: e.WHATSAPP_PUBLIC_NUMBER ?? e.WA_DISPLAY_NUMBER ?? (e.NODE_ENV === "production" ? null : DEV_PLACEHOLDER_NUMBER),
      keyword: e.WHATSAPP_PUBLIC_KEYWORD,
    },
  });
  return cached;
}
