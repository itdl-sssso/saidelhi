import { articles, contentItems, settings } from "./content";
import { estimates, events, kpiFacts, timeline } from "./events";
import { centres, gatherings, orgUnits, partners, sevaTypes } from "./org";

export * from "./ids";
export { EVENT, USER } from "./events";
export { devUserPhone, portalFixtures, type PortalFixtures } from "./people";
export { waFixtures, type WaFixtures } from "./wa";
export { CENTRE, DISTRICT, NCR_ID, PARTNER, SAMITHI } from "./org";
export { SAMPLE_ARTICLE_ID } from "./content";

export interface Fixtures {
  orgUnits: typeof orgUnits;
  sevaTypes: typeof sevaTypes;
  partners: typeof partners;
  centres: typeof centres;
  gatherings: typeof gatherings;
  events: typeof events;
  timeline: typeof timeline;
  kpiFacts: typeof kpiFacts;
  estimates: typeof estimates;
  articles: typeof articles;
  contentItems: typeof contentItems;
  settings: typeof settings;
}

/** Fresh deep copy so tests and the mock repo can mutate safely. */
export function loadFixtures(): Fixtures {
  return structuredClone({
    orgUnits,
    sevaTypes,
    partners,
    centres,
    gatherings,
    events,
    timeline,
    kpiFacts,
    estimates,
    articles,
    contentItems,
    settings,
  });
}
