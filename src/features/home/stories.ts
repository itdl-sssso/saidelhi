import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { TAGS } from "@/features/public/data";
import { services } from "@/server/services";

/** One card in the Home "Told by the people who were there" section. */
export type HomeStory = {
  title: { en: string; hi: string | null };
  excerpt: { en: string; hi: string | null };
  /** Locale-free internal path ("/stories/...") or an absolute URL. */
  href: string;
  image?: { url: string; alt: { en: string; hi: string | null } } | null;
};

/** Home stories: newest 3 items of the "Golden Stories" content type, both languages. */
export async function getHomeStories(): Promise<HomeStory[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.home, TAGS.articles);
  const svc = services().articles;
  const [en, hi] = await Promise.all([svc.goldenStories("en", 3), svc.goldenStories("hi", 3)]);
  return en.map((s) => {
    const h = hi.find((x) => x.href === s.href);
    return {
      title: { en: s.title, hi: h && h.title !== s.title ? h.title : null },
      excerpt: { en: s.excerpt, hi: h && h.excerpt !== s.excerpt ? h.excerpt : null },
      href: s.href,
      image: s.image ? { url: s.image.url, alt: s.image.alt } : null,
    };
  });
}
