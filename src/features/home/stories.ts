/** One card in the Home "Told by the people who were there" section. */
export type HomeStory = {
  title: { en: string; hi: string | null };
  excerpt: { en: string; hi: string | null };
  /** Locale-free internal path ("/stories/...") or an absolute URL. */
  href: string;
  image?: { url: string; alt: { en: string; hi: string | null } } | null;
};

/**
 * SINGLE WIRING POINT for the Home stories section.
 * Stories come from the content type "Golden Stories", built on another track. Until that
 * lands this returns [] and the section shows its "on their way" state. When it lands, map
 * the content items to HomeStory here (newest first, max 3) and nothing else needs to change.
 */
export async function getHomeStories(): Promise<HomeStory[]> {
  return [];
}
