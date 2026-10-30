import type { ArticleRec, ContentItemRec, SliderImageRec } from "../../repo/types";
import { EVENT } from "./events";
import { fx } from "./ids";
import { DISTRICT } from "./org";

const thought = (n: number, date: string, en: string, hi: string): ContentItemRec => ({
  id: fx("CNT", n),
  kind: "thought_for_day",
  key: null,
  titleEn: null,
  titleHi: null,
  bodyEn: en,
  bodyHi: hi,
  sourceEn: "Sri Sathya Sai Baba",
  sourceHi: "श्री सत्य साई बाबा",
  href: null,
  date,
  status: "published",
  sortOrder: 0,
});

export const contentItems: ContentItemRec[] = [
  thought(1, "2026-10-21", "Love all, serve all.", "सबसे प्रेम करो, सबकी सेवा करो।"),
  thought(2, "2026-10-22", "Hands that serve are holier than lips that pray.", "सेवा करने वाले हाथ प्रार्थना करने वाले होंठों से अधिक पवित्र हैं।"),
  thought(3, "2026-12-01", "A future thought that must not show yet.", "भविष्य का विचार।"),
];

/** Legacy ids from 900001 upwards never collide with the real saidelhi.org posts. */
export const SAMPLE_ARTICLE_ID = 900001;

const article = (
  id: number,
  slug: string,
  category: string,
  title: string,
  summary: string,
  content: string,
  createdAt: string,
  i18n: ArticleRec["i18n"] = null,
): ArticleRec => ({
  id,
  slug,
  category,
  title,
  shortDescription: summary,
  content,
  featuredImage: "",
  createdAt: new Date(createdAt),
  updatedAt: new Date(createdAt),
  i18n,
  gallery: [],
});

export const articles: ArticleRec[] = [
  article(
    SAMPLE_ARTICLE_ID,
    "eye-camp-mayur-vihar-oct-2026",
    "A",
    "115 people screened at the Mayur Vihar eye camp",
    "Sevadal members and ICARE Eye Hospital screened 115 people and gave 63 pairs of reading spectacles.",
    "<p>On 17 October 2026 Sevadal members of Samithi Mayur Vihar held a free eye screening camp at Dr. Ambedkar Bhawan with ICARE Eye Hospital.</p><p>115 people were screened, 63 received reading spectacles on the spot, and 13 were referred for cataract surgery.</p><script>alert(1)</script>",
    "2026-10-21T06:30:00Z",
    {
      legacyId: SAMPLE_ARTICLE_ID,
      titleHi: "मयूर विहार नेत्र शिविर में 115 लोगों की जाँच",
      summaryHi: "सेवादलों और ICARE नेत्र अस्पताल ने 115 लोगों की जाँच की और 63 पढ़ने के चश्मे दिए।",
      bodyHi: "<p>17 अक्टूबर 2026 को समिति मयूर विहार के सेवादलों ने ICARE नेत्र अस्पताल के साथ डॉ. अम्बेडकर भवन में निःशुल्क नेत्र जाँच शिविर लगाया।</p><p>115 लोगों की जाँच हुई, 63 को मौके पर पढ़ने के चश्मे मिले और 13 को मोतियाबिंद ऑपरेशन के लिए भेजा गया।</p>",
      districtId: DISTRICT.east,
      eventId: EVENT.eyeCamp,
      status: "published",
    },
  ),
  article(
    900002,
    "blood-donation-karol-bagh-sep-2026",
    "A",
    "Blood donation camp at Karol Bagh",
    "48 donors came forward at the September camp.",
    "<p>Donors and Sevadal members gathered at the Karol Bagh centre for the September blood donation camp.</p>",
    "2026-09-18T06:30:00Z",
  ),
  article(900003, "state-centenary-celebrations", "D", "Centenary celebrations across Delhi NCR", "Samithis mark the centenary year with seva.", "<h1>Centenary year</h1><p>Every samithi is marking the centenary with a seva project.</p>", "2026-06-01T06:30:00Z"),
  article(900004, "national-centenary-programme", "C", "National centenary programme", "An overview of the national programme.", "<p>The national programme brings together seva, study and devotion.</p>", "2026-05-20T06:30:00Z"),
  article(900005, "new-website-launch", "N", "A new website for Delhi NCR", "Find seva near you, in Hindi and English.", "<p>The new site shows upcoming seva, centres and approved impact figures.</p>", "2026-10-15T06:30:00Z"),
  article(900006, "a-day-at-narayan-seva", "P", "A morning at Narayan Seva", "What a food seva morning looks like.", "<p>Cooking begins at six. By eight the first families arrive.</p>", "2026-08-20T06:30:00Z"),
  article(900007, "hidden-legacy-post", "N", "Hidden post", "Not public.", "<p>Hidden.</p>", "2026-10-16T06:30:00Z", {
    legacyId: 900007,
    titleHi: null,
    summaryHi: null,
    bodyHi: null,
    districtId: null,
    eventId: null,
    status: "hidden",
  }),
];

export const sliderImages: SliderImageRec[] = [
  { id: 1, image: "content_slider_gallery/001.jpg", caption1: "Love All", caption2: "Serve All", order: 1 },
  { id: 2, image: "content_slider_gallery/002.jpg", caption1: "Help Ever", caption2: "Hurt Never", order: 2 },
];

export const settings: Record<string, unknown> = {
  flags: { offline_mode: false, ai_extraction: false },
  impact: { showEstimates: true },
  links: { reportLinkDays: 14, deskLink: "event_day", otpMaxAttempts: 5, otpLockMinutes: 10 },
  escalation: { approvalDays: 3, reminderDay: 2, reportDueDays: 3, reportReminderDays: [1, 3, 7] },
};
