// Dev review tracker: every user-facing route, grouped, with spec + design references. Pure data.

export type ReviewGroup = "public-en" | "public-hi" | "forms" | "portal" | "discourses" | "dev";

export const GROUP_LABEL: Record<ReviewGroup, string> = {
  "public-en": "Public (EN)",
  "public-hi": "Public (HI)",
  forms: "Form links",
  portal: "Portal",
  discourses: "Discourses",
  dev: "Dev tools",
};

export const PORTAL_AREAS = ["Operate", "Collect", "Organisation", "Publish", "Communicate", "Govern"] as const;
export type PortalArea = (typeof PORTAL_AREAS)[number];

/** Seeded dev logins (OTP prints in the review server log). */
export const ROLES = {
  samithi: { phone: "+91 90000 00001", label: "Samithi coordinator" },
  district: { phone: "+91 90000 00002", label: "District coordinator" },
  state: { phone: "+91 90000 00003", label: "State admin" },
  editor: { phone: "+91 90000 00004", label: "Content editor" },
  translator: { phone: "+91 90000 00005", label: "Translator" },
  pii: { phone: "+91 90000 00006", label: "Privacy officer" },
} as const;
export type RoleKey = keyof typeof ROLES;

export type DesignRef = { label: string; path: string };

export type ReviewEntry = {
  id: string;
  group: ReviewGroup;
  area?: PortalArea;
  title: string;
  path: string;
  spec?: { n: number; name: string };
  design?: DesignRef[];
  role?: RoleKey;
  note?: string;
};

/** Real seed examples, resolved on the server (null when the DB has none). */
export type Samples = {
  eventId: string | null;
  centreSlug: string | null;
  districtSlug: string | null;
  articleSlug: string | null;
  galleryAlbumSlug: string | null;
  programType: string | null;
  discourseSlug: string | null;
  tokens: Record<string, string>;
  admin: { eventId?: string; centreId?: string; contentId?: string; inboxId?: string; formId?: string; galleryAlbumId?: string; galleryPhotoId?: string };
};

export const EMPTY_SAMPLES: Samples = {
  eventId: null,
  centreSlug: null,
  districtSlug: null,
  articleSlug: null,
  galleryAlbumSlug: null,
  programType: null,
  discourseSlug: null,
  tokens: {},
  admin: {},
};

export const VALUES = ["sathya", "dharma", "shanti", "prema", "ahimsa"] as const;

export const SPEC_NAMES: Record<number, string> = {
  1: "Home",
  2: "Value",
  3: "About",
  4: "Impact",
  5: "Programs",
  6: "Program",
  7: "News",
  8: "Article",
  9: "Calendar",
  10: "Event",
  11: "Join",
  12: "Map",
  13: "District",
  14: "Centre",
  15: "Discourses",
  16: "Discourse",
  17: "Privacy",
  18: "Errors",
  19: "Form verify",
  20: "Form fill",
  21: "Form done",
  22: "Form invalid",
  23: "Admin login",
  24: "Admin overview",
  25: "Admin events",
  26: "Admin event detail",
  27: "Admin event form",
  28: "Admin inbox",
  29: "Admin approvals",
  30: "Admin form templates",
  31: "Admin form builder",
  32: "Admin links",
  33: "Admin uploads",
  34: "Admin org",
  35: "Admin centres",
  36: "Admin partners",
  37: "Admin people",
  38: "Admin content",
  39: "Admin discourses",
  40: "Admin impact",
  41: "Admin migration",
  42: "Admin WhatsApp",
  43: "Admin Sevadal",
  44: "Admin reports",
  45: "Admin health",
  46: "Admin follow-up",
  47: "Admin privacy",
  48: "Admin audit",
  49: "Admin settings",
  50: "WhatsApp bot",
};

const SPEC_FILE: Record<number, string> = {
  1: "01-home", 2: "02-value", 3: "03-about", 4: "04-impact", 5: "05-programs", 6: "06-program", 7: "07-articles", 8: "08-article",
  9: "09-calendar", 10: "10-event", 11: "11-join", 12: "12-map", 13: "13-district", 14: "14-centre", 15: "15-discourses", 16: "16-discourse",
  17: "17-privacy", 18: "18-errors", 19: "19-form-verify", 20: "20-form-fill", 21: "21-form-done", 22: "22-form-invalid", 23: "23-admin-login",
  24: "24-admin-overview", 25: "25-admin-events", 26: "26-admin-event-detail", 27: "27-admin-event-form", 28: "28-admin-inbox",
  29: "29-admin-approvals", 30: "30-admin-form-templates", 31: "31-admin-form-builder", 32: "32-admin-links", 33: "33-admin-uploads",
  34: "34-admin-org", 35: "35-admin-centres", 36: "36-admin-partners", 37: "37-admin-people", 38: "38-admin-content", 39: "39-admin-discourses",
  40: "40-admin-impact", 41: "41-admin-migration", 42: "42-admin-whatsapp", 43: "43-admin-sevadal", 44: "44-admin-reports",
  45: "45-admin-health", 46: "46-admin-follow-up", 47: "47-admin-privacy", 48: "48-admin-audit", 49: "49-admin-settings", 50: "50-whatsapp-bot", 52: "52-gallery",
};

export const specFile = (n: number) => `docs/specs/${SPEC_FILE[n]}.md`;

// Design references (files under docs/design, served by /api/dev/design/<path>).
const D = {
  home: { label: "Home v2 wireframe", path: "wireframes/Home v2.html" },
  lotus: { label: "3D lotus journey", path: "wireframes/A2 3D Lotus Journey.html" },
  cal: { label: "Calendar wireframe", path: "wireframes/Calendar.html" },
  map: { label: "Map wireframe", path: "wireframes/Map.html" },
  articles: { label: "Articles wireframe", path: "wireframes/Articles.html" },
  article: { label: "Article wireframe", path: "wireframes/Article.html" },
  pub2: { label: "Batch 2 Public core", path: "public/Batch 2 Public Core.html" },
  pub4: { label: "Batch 4 Public P1", path: "public/Batch 4 Public P1.html" },
  b1: { label: "Batch 1 Pilot core", path: "portal/Batch 1 Pilot Core.html" },
  b3: { label: "Batch 3 P0 rest", path: "portal/Batch 3 P0 Rest.html" },
  b5a: { label: "Batch 5a Collect", path: "portal/Batch 5a Collect.html" },
  b5b: { label: "Batch 5b Builder and organisation", path: "portal/Batch 5b Builder and organisation.html" },
  b5c: { label: "Batch 5c Content and WhatsApp", path: "portal/Batch 5c Content and WhatsApp.html" },
  b5d: { label: "Batch 5d Reports and governance", path: "portal/Batch 5d Reports and governance.html" },
  b6a: { label: "Batch 6a Discourses public", path: "portal/Batch 6a Discourses public.html" },
  b6b: { label: "Batch 6b Discourses admin", path: "portal/Batch 6b Discourses admin.html" },
  ds: { label: "DS additions", path: "ds-additions/DS Additions.html" },
} satisfies Record<string, DesignRef>;
const value = (v: string): DesignRef => ({ label: `Value ${v} wireframe`, path: `wireframes/Value ${v[0]!.toUpperCase()}${v.slice(1)}.html` });

type Raw = { id: string; title: string; path: string; spec?: number; design?: DesignRef[]; note?: string };

function publicRaw(s: Samples): Raw[] {
  const out: Raw[] = [
    { id: "home", title: "Home", path: "/", spec: 1, design: [D.home, D.lotus] },
    { id: "about", title: "About", path: "/about", spec: 3, design: [D.pub4] },
    { id: "calendar", title: "Calendar", path: "/calendar", spec: 9, design: [D.cal] },
    { id: "map", title: "Centres map", path: "/centres/map", spec: 12, design: [D.map] },
    { id: "impact", title: "Impact", path: "/impact", spec: 4, design: [D.pub2] },
    { id: "join", title: "Join", path: "/join", spec: 11, design: [D.pub4] },
    { id: "donate", title: "Donate", path: "/donate", spec: 51 },
    { id: "news", title: "News list", path: "/news", spec: 7, design: [D.articles, D.pub4] },
    { id: "gallery", title: "Gallery", path: "/gallery", spec: 52, note: "No design board; follows News list + article photo grid." },
    { id: "privacy", title: "Privacy", path: "/privacy", spec: 17 },
    { id: "programs", title: "Programs list", path: "/programs", spec: 5, design: [D.pub4] },
  ];
  if (s.programType) out.push({ id: "program", title: `Program (${s.programType})`, path: `/programs/${s.programType}`, spec: 6, design: [D.pub4] });
  if (s.eventId) out.push({ id: "event", title: "Event", path: `/events/${s.eventId}`, spec: 10, design: [D.pub2] });
  if (s.centreSlug) out.push({ id: "centre", title: `Centre (${s.centreSlug})`, path: `/centres/${s.centreSlug}`, spec: 14, design: [D.pub2] });
  if (s.articleSlug) out.push({ id: "article", title: "Article", path: `/news/${s.articleSlug}`, spec: 8, design: [D.article, D.pub4] });
  if (s.districtSlug) out.push({ id: "district", title: `District (${s.districtSlug})`, path: `/districts/${s.districtSlug}`, spec: 13, design: [D.pub2, D.pub4] });
  if (s.galleryAlbumSlug) out.push({ id: "gallery-album", title: "Gallery album", path: `/gallery/${s.galleryAlbumSlug}`, spec: 52, note: "Lightbox: click a photo, check Esc, arrows, focus return, swipe at 375px." });
  for (const v of VALUES) out.push({ id: `value-${v}`, title: `Value: ${v}`, path: `/values/${v}`, spec: 2, design: [value(v)] });
  out.push(
    { id: "not-found", title: "404 page", path: "/this-page-does-not-exist", spec: 18, note: "Should show the localised not-found page with status 404." },
    { id: "legacy-redirect", title: "Legacy URL redirect", path: "/about-us", note: "Old saidelhi.org URL; should 301 to /about." },
  );
  return out;
}

const withLocale = (p: string, hi: boolean) => (hi ? (p === "/" ? "/hi" : `/hi${p}`) : p);

function discourseRaw(s: Samples): Raw[] {
  const out: Raw[] = [{ id: "discourses", title: "Discourses list", path: "/discourses", spec: 15, design: [D.b6a], note: "Behind the `discourses` flag (on in dev)." }];
  if (s.discourseSlug) out.push({ id: "discourse", title: `Discourse (${s.discourseSlug})`, path: `/discourses/${s.discourseSlug}`, spec: 16, design: [D.b6a] });
  return out;
}

function formRaw(s: Samples): Raw[] {
  const t = s.tokens;
  const out: Raw[] = [];
  const rep = t["eye-report"];
  if (rep) {
    out.push(
      { id: "form-verify", title: "Form link: verify (eye report)", path: `/f/${rep}`, spec: 19, design: [D.b1], note: "Coordinator phone +91 90000 00001; OTP prints in the review server log." },
      { id: "form-fill", title: "Form link: fill", path: `/f/${rep}/form`, spec: 20, design: [D.b1, D.ds], note: "Needs a verified link session: verify on the first page, then continue." },
      { id: "form-done", title: "Form link: done", path: `/f/${rep}/done`, spec: 21, design: [D.b1], note: "Shown after sending a report." },
    );
  }
  if (t["eye-expired"]) out.push({ id: "form-expired", title: "Form link: expired", path: `/f/${t["eye-expired"]}`, spec: 22, design: [D.b3] });
  if (t["eye-public"]) out.push({ id: "form-public", title: "Form link: public (no OTP)", path: `/f/${t["eye-public"]}`, spec: 19, design: [D.b1] });
  out.push({ id: "form-invalid", title: "Form link: invalid token", path: "/f/AAAAAAAAAAAAAAAAAAAAAA", spec: 22, design: [D.b3] });
  return out;
}

type PRaw = Raw & { area: PortalArea; role: RoleKey };

function portalRaw(s: Samples): PRaw[] {
  const a = s.admin;
  const ev = a.eventId ?? s.eventId ?? undefined;
  const list: Array<PRaw | false | undefined> = [
    { id: "adm-login", area: "Operate", role: "state", title: "Login", path: "/admin/login", spec: 23, design: [D.b1], note: "Log out first to see it." },
    { id: "adm-overview", area: "Operate", role: "state", title: "Overview", path: "/admin", spec: 24, design: [D.b1] },
    { id: "adm-events", area: "Operate", role: "district", title: "Events", path: "/admin/events", spec: 25, design: [D.b1] },
    { id: "adm-event-new", area: "Operate", role: "samithi", title: "Plan event", path: "/admin/events/new", spec: 27, design: [D.b3] },
    !!ev && { id: "adm-event", area: "Operate", role: "district", title: "Event detail", path: `/admin/events/${ev}`, spec: 26, design: [D.b1] },
    !!ev && { id: "adm-event-edit", area: "Operate", role: "samithi", title: "Edit event", path: `/admin/events/${ev}/edit`, spec: 27, design: [D.b3] },
    { id: "adm-inbox", area: "Operate", role: "samithi", title: "Review inbox", path: "/admin/inbox", spec: 28, design: [D.b5c] },
    !!a.inboxId && { id: "adm-inbox-item", area: "Operate", role: "samithi", title: "Inbox item", path: `/admin/inbox/${a.inboxId}`, spec: 28, design: [D.b5c] },
    { id: "adm-approvals", area: "Operate", role: "district", title: "Approvals", path: "/admin/approvals", spec: 29, design: [D.b1, D.b3] },
    { id: "adm-links", area: "Collect", role: "samithi", title: "Form links", path: "/admin/links", spec: 32, design: [D.b5a] },
    { id: "adm-forms", area: "Collect", role: "state", title: "Form templates", path: "/admin/forms", spec: 30, design: [D.b5b] },
    !!a.formId && { id: "adm-form-edit", area: "Collect", role: "state", title: "Form builder", path: `/admin/forms/${a.formId}/edit`, spec: 31, design: [D.b5b, D.ds] },
    { id: "adm-uploads", area: "Collect", role: "district", title: "Uploads", path: "/admin/uploads", spec: 33, design: [D.b5a] },
    { id: "adm-uploads-new", area: "Collect", role: "district", title: "New upload", path: "/admin/uploads/new", spec: 33, design: [D.b5a] },
    { id: "adm-volunteers", area: "Collect", role: "district", title: "Sevadal", path: "/admin/sevadal", spec: 43, design: [D.b5d] },
    { id: "adm-org", area: "Organisation", role: "state", title: "Organisation", path: "/admin/org", spec: 34, design: [D.b5b] },
    { id: "adm-centres", area: "Organisation", role: "state", title: "Centres", path: "/admin/centres", spec: 35, design: [D.b5b] },
    !!a.centreId && { id: "adm-centre", area: "Organisation", role: "state", title: "Centre detail", path: `/admin/centres/${a.centreId}`, spec: 35, design: [D.b5b] },
    { id: "adm-partners", area: "Organisation", role: "state", title: "Partners", path: "/admin/partners", spec: 36, design: [D.b5b] },
    { id: "adm-people", area: "Organisation", role: "state", title: "People", path: "/admin/people", spec: 37, design: [D.b5b] },
    { id: "adm-content", area: "Publish", role: "editor", title: "Content", path: "/admin/content", spec: 38, design: [D.b5c] },
    { id: "adm-gallery", area: "Publish", role: "editor", title: "Gallery review", path: "/admin/gallery", spec: 52 },
    { id: "adm-gallery-albums", area: "Publish", role: "editor", title: "Gallery albums", path: "/admin/gallery?tab=albums", spec: 52 },
    !!a.galleryAlbumId && { id: "adm-gallery-album", area: "Publish", role: "editor", title: "Gallery album", path: `/admin/gallery/albums/${a.galleryAlbumId}`, spec: 52 },
    !!a.galleryPhotoId && { id: "adm-gallery-photo", area: "Publish", role: "editor", title: "Photo editor", path: `/admin/gallery/photos/${a.galleryPhotoId}`, spec: 52 },
    !!a.contentId && { id: "adm-content-item", area: "Publish", role: "editor", title: "Content editor", path: `/admin/content/${a.contentId}`, spec: 38, design: [D.b5c] },
    { id: "adm-thoughts", area: "Publish", role: "editor", title: "Thoughts for the day", path: "/admin/content/thoughts", spec: 38, design: [D.b5c] },
    { id: "adm-impact", area: "Publish", role: "state", title: "Impact controls", path: "/admin/impact", spec: 40, design: [D.b5c] },
    { id: "adm-discourses", area: "Publish", role: "translator", title: "Discourses workspace", path: "/admin/discourses", spec: 39, design: [D.b6b] },
    { id: "adm-whatsapp", area: "Communicate", role: "state", title: "WhatsApp", path: "/admin/whatsapp", spec: 42, design: [D.b5c] },
    { id: "adm-reports", area: "Communicate", role: "state", title: "Reports and exports", path: "/admin/reports", spec: 44, design: [D.b5d] },
    { id: "adm-health", area: "Govern", role: "state", title: "Health", path: "/admin/health", spec: 45, design: [D.b5d] },
    { id: "adm-follow-up", area: "Govern", role: "pii", title: "Follow-up (personal data)", path: "/admin/follow-up", spec: 46, design: [D.b5d] },
    { id: "adm-privacy", area: "Govern", role: "pii", title: "Privacy requests", path: "/admin/privacy", spec: 47, design: [D.b5d] },
    { id: "adm-audit", area: "Govern", role: "state", title: "Audit log", path: "/admin/audit", spec: 48, design: [D.b5d] },
    { id: "adm-migration", area: "Govern", role: "state", title: "Migration", path: "/admin/migration", spec: 41, design: [D.b5d] },
    { id: "adm-settings", area: "Govern", role: "state", title: "Settings", path: "/admin/settings", spec: 49, design: [D.b5d] },
  ];
  return list.filter((x): x is PRaw => !!x);
}

export function buildCatalog(s: Samples): ReviewEntry[] {
  const spec = (n?: number) => (n ? { n, name: SPEC_NAMES[n]! } : undefined);
  const mk = (group: ReviewGroup, r: Raw, extra: Partial<ReviewEntry> = {}): ReviewEntry => ({
    id: r.id,
    group,
    title: r.title,
    path: r.path,
    spec: spec(r.spec),
    design: r.design,
    note: r.note,
    ...extra,
  });
  const pub = publicRaw(s);
  const out: ReviewEntry[] = [
    ...pub.map((r) => mk("public-en", { ...r, id: `en-${r.id}` })),
    ...pub.filter((r) => r.id !== "legacy-redirect").map((r) => mk("public-hi", { ...r, id: `hi-${r.id}`, path: withLocale(r.path, true), title: `${r.title} (HI)` })),
    ...formRaw(s).map((r) => mk("forms", r)),
    ...portalRaw(s).map((r) => mk("portal", r, { area: r.area, role: r.role })),
    ...discourseRaw(s).map((r) => mk("discourses", r)),
    ...discourseRaw(s).map((r) => mk("discourses", { ...r, id: `hi-${r.id}`, path: withLocale(r.path, true), title: `${r.title} (HI)`, note: undefined })),
    { id: "dev-ui", group: "dev", title: "Component kitchen sink", path: "/dev/ui", note: "Dev only." },
    { id: "dev-whatsapp", group: "dev", title: "WhatsApp bot simulator", path: "/dev/whatsapp", spec: { n: 50, name: SPEC_NAMES[50]! }, design: [D.b5c], note: "Dev only. Try +91 90000 00001 (coordinator, Hindi), 00003 (state admin), +91 98765 43210 (public)." },
  ];
  return out;
}

/** Same path in the other locale (portal pages have a /hi twin; used by the Hindi check button). */
export const hindiPath = (p: string) => (p.startsWith("/hi") ? p : withLocale(p, true));
