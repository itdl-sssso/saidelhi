// Share-card renderer (1200x630) for every opengraph-image / twitter-image route. Fonts and emblem are local files:
// no network at render time. Tokens: design-system/tokens/colors.css.
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const FONT_DIR = join(process.cwd(), "src/assets/fonts");
const font = (f: string) => readFile(join(FONT_DIR, f));
// Loaded once per server process.
const assets = Promise.all([
  font("NotoSans-Regular.ttf"),
  font("NotoSans-Bold.ttf"),
  font("NotoSansDevanagari-Regular.ttf"),
  font("NotoSansDevanagari-Bold.ttf"),
  readFile(join(process.cwd(), "public/brand/emblem-512.png")),
]);

const C = { cream: "#FAFAFA", blue50: "#EAF8FE", blue600: "#146582", blue700: "#164A5F", gold300: "#E8B84E", gold600: "#7A590B", slate500: "#656C79", slate900: "#111827" };

export function ogLocale(raw: string): Locale {
  return hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
}

export async function ogText(locale: Locale) {
  const t = await getTranslations({ locale, namespace: "og" });
  const m = await getTranslations({ locale, namespace: "meta" });
  return { t, m };
}

export const ogCache = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

type Card = {
  locale: Locale;
  orgName: string;
  region: string;
  /** Section label above the title; omit for the site-wide card. */
  label?: string;
  title?: string;
  /** Line under the title (date, place). */
  sub?: string;
  tagline?: string;
};

type TextOpts = { size: number; color: string; bold?: boolean; width: number; upper?: boolean; track?: number };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Satori does no complex-script shaping (Devanagari matras and conjuncts come out wrong), so Hindi text is shaped
 * by Pango through sharp, using the bundled font file, and placed as an image. English stays live text.
 */
async function T(locale: Locale, str: string, o: TextOpts): Promise<React.ReactElement> {
  if (locale !== "hi") {
    return (
      <div style={{ display: "flex", width: o.width, fontSize: o.size, fontWeight: o.bold ? 700 : 400, color: o.color, lineHeight: 1.2, letterSpacing: o.track ?? 0, textTransform: o.upper ? "uppercase" : "none" }}>
        {str}
      </div>
    );
  }
  const file = join(FONT_DIR, o.bold ? "NotoSansDevanagari-Bold.ttf" : "NotoSansDevanagari-Regular.ttf");
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${o.color}">${esc(str)}</span>`,
      font: `Noto Sans Devanagari ${o.bold ? "Bold" : "Regular"} ${o.size}`,
      fontfile: file,
      width: o.width,
      rgba: true,
      spacing: Math.round(o.size * 0.18),
      wrap: "word",
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`data:image/png;base64,${data.toString("base64")}`} width={info.width} height={info.height} alt="" />
  );
}

export async function renderOg(card: Card, headers?: Record<string, string>) {
  const [sans, sansBold, devaReg, devaBold, emblem] = await assets;
  const emblemUri = `data:image/png;base64,${emblem.toString("base64")}`;
  const { locale } = card;
  const home = !card.title;
  const title = clip(card.title ?? card.orgName, 110);
  const colW = home ? 640 : 1040;
  const tsize = home ? 64 : title.length > 70 ? 46 : title.length > 40 ? 56 : 66;

  const orgLine = !home ? await T(locale, card.orgName, { size: 26, color: C.blue700, bold: true, width: 800 }) : null;
  const regLine = await T(locale, card.region, home ? { size: 44, color: C.blue600, width: colW } : { size: 24, color: C.slate500, width: 800 });
  const label = card.label ? await T(locale, card.label, { size: 28, color: C.gold600, bold: true, width: colW, upper: true, track: locale === "hi" ? 0 : 5 }) : null;
  const titleEl = await T(locale, title, { size: tsize, color: home ? C.blue700 : C.slate900, bold: true, width: colW });
  const sub = !home && card.sub ? await T(locale, clip(card.sub, 60), { size: 30, color: C.slate500, width: colW }) : null;
  const tag = home && card.tagline ? await T(locale, card.tagline, { size: 26, color: C.slate500, width: colW }) : null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: `linear-gradient(135deg, ${C.cream} 0%, ${C.blue50} 100%)`, fontFamily: "Noto Sans, Noto Sans Devanagari" }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 80px", gap: 64 }}>
          {home ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={emblemUri} width={340} height={340} alt="" />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {home ? null : (
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 40 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={emblemUri} width={84} height={84} alt="" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {orgLine}
                  {regLine}
                </div>
              </div>
            )}
            {label ? <div style={{ display: "flex", marginBottom: 14 }}>{label}</div> : null}
            {titleEl}
            {home ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", width: 96, height: 5, background: C.gold300, margin: "24px 0 20px" }} />
                {regLine}
                <div style={{ display: "flex", marginTop: 24 }}>{tag}</div>
              </div>
            ) : sub ? (
              <div style={{ display: "flex", marginTop: 22 }}>{sub}</div>
            ) : null}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "0 80px", height: 64, fontSize: 24, color: C.slate500 }}>saidelhi.org</div>
        <div style={{ display: "flex", height: 10, background: C.gold300 }} />
      </div>
    ),
    {
      ...ogSize,
      headers,
      fonts: [
        { name: "Noto Sans", data: sans, weight: 400, style: "normal" },
        { name: "Noto Sans", data: sansBold, weight: 700, style: "normal" },
        { name: "Noto Sans Devanagari", data: devaReg, weight: 400, style: "normal" },
        { name: "Noto Sans Devanagari", data: devaBold, weight: 700, style: "normal" },
      ],
    },
  );
}

/** Section card: resolves labels, falls back to the site-wide card when the entity is unknown. */
export async function sectionOg(
  localeRaw: string,
  section: "events" | "news" | "discourses" | "values" | "programs" | "centres" | "districts" | "gallery",
  content: { title: string; sub?: string } | null,
) {
  const locale = ogLocale(localeRaw);
  const { t, m } = await ogText(locale);
  const base = { locale, orgName: m("orgName"), region: m("region") };
  if (!content) return renderOg({ ...base, tagline: t("tagline") }, ogCache);
  return renderOg({ ...base, label: t(section), title: content.title, sub: content.sub }, ogCache);
}
