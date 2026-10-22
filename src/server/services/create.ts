import type { DataRepo } from "../repo/types";
import { createArticlesService } from "./articles";
import { createAuthService } from "./auth";
import { createCentresService } from "./centres";
import { createDistrictsService } from "./districts";
import { createEventsService } from "./events";
import { createHomeService } from "./home";
import { DiskStorage } from "../files";
import { ConsoleEmail } from "../providers/email";
import { ConsoleWhatsApp } from "../providers/whatsapp/console";
import { DEV_SESSION_SECRET } from "../security/crypto";
import { createImpactService } from "./impact";
import { createLinksService } from "./links";
import { createPortalServices, type PortalCtx, type PortalServices } from "./portal";
import { createPrivacyService } from "./privacy";
import { loadSettings } from "./shared";
import type { LinkServiceDeps, ServiceDeps, Services } from "./types";

/** Wires every service over one repository. Pure: safe to use in tests. */
export function createServices(repo: DataRepo, deps: ServiceDeps): Services {
  const full: LinkServiceDeps = {
    secret: DEV_SESSION_SECRET,
    whatsapp: new ConsoleWhatsApp(),
    storage: new DiskStorage("./media-private"),
    appUrl: "http://localhost:3000",
    revalidate: () => {},
    email: new ConsoleEmail(),
    ...deps,
    // `portal` is created below; the hook only runs after a request, never during wiring.
    onReportSubmitted: (eventId) => portal.onReportSubmitted(eventId),
  };
  const links = createLinksService(repo, full);
  const ctx: PortalCtx = { repo, deps: full, links };
  const portal: PortalServices = createPortalServices(ctx);
  return {
    dataSource: repo.kind,
    home: createHomeService(repo, deps),
    events: createEventsService(repo, deps),
    centres: createCentresService(repo, deps),
    districts: createDistrictsService(repo, deps),
    impact: createImpactService(repo, deps),
    articles: createArticlesService(repo, deps),
    privacy: createPrivacyService(repo, deps),
    flags: { flags: async () => (await loadSettings(repo)).flags },
    links,
    auth: createAuthService(ctx),
    portal,
  };
}
