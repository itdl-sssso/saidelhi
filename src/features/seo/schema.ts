import type { ArticleDetail, DiscourseDetail, EventPublic } from "@/contract";
import { tx, type AppLocale } from "@/lib/format";
import { metaDescription } from "./meta";

/** Absolute URL of a public path in the given locale (EN unprefixed, HI under /hi). */
export function localeUrl(base: string, locale: AppLocale, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path === "/" ? "" : path;
  return `${b}${locale === "hi" ? "/hi" : ""}${p}` || `${b}/`;
}

const abs = (base: string, src: string) => (/^https?:\/\//.test(src) ? src : `${base.replace(/\/$/, "")}${src.startsWith("/") ? "" : "/"}${src}`);

export function orgRef(base: string, name: string) {
  return { "@type": "NGO", "@id": `${base.replace(/\/$/, "")}/#organization`, name };
}

/** Home page: the organisation and the website itself. */
export function organizationSchema(o: { base: string; locale: AppLocale; name: string; alternateName: string; description: string; areaServed: string }) {
  const site = localeUrl(o.base, o.locale, "/");
  return {
    "@graph": [
      {
        ...orgRef(o.base, o.name),
        alternateName: o.alternateName,
        url: site,
        logo: abs(o.base, "/brand/emblem-512.png"),
        description: o.description,
        areaServed: { "@type": "AdministrativeArea", name: o.areaServed },
        founder: { "@type": "Person", name: "Bhagawan Sri Sathya Sai Baba" },
        parentOrganization: { "@type": "NGO", name: "Sri Sathya Sai Seva Organisation, India", url: "https://ssssoindia.org" },
        slogan: "Love All, Serve All",
        knowsLanguage: ["en", "hi"],
      },
      {
        "@type": "WebSite",
        "@id": `${o.base.replace(/\/$/, "")}/#website`,
        url: site,
        name: o.alternateName,
        inLanguage: o.locale,
        publisher: { "@id": `${o.base.replace(/\/$/, "")}/#organization` },
      },
    ],
  };
}

export function articleSchema(a: ArticleDetail, o: { base: string; locale: AppLocale; orgName: string }) {
  const url = localeUrl(o.base, o.locale, `/news/${encodeURIComponent(a.slug)}`);
  return {
    "@type": "NewsArticle",
    "@id": url,
    url,
    mainEntityOfPage: url,
    headline: tx(a.title, o.locale).slice(0, 110),
    description: metaDescription(tx(a.summary, o.locale)),
    datePublished: a.publishedAt,
    inLanguage: o.locale,
    ...(a.cover ? { image: [abs(o.base, a.cover.url)] } : {}),
    author: orgRef(o.base, o.orgName),
    publisher: { ...orgRef(o.base, o.orgName), logo: { "@type": "ImageObject", url: abs(o.base, "/brand/emblem-512.png") } },
  };
}

export function eventSchema(e: EventPublic, o: { base: string; locale: AppLocale; orgName: string; sevaLabel: string }) {
  const url = localeUrl(o.base, o.locale, `/events/${e.id}`);
  const status = e.status === "cancelled" ? "EventCancelled" : e.postponedTo ? "EventRescheduled" : "EventScheduled";
  return {
    "@type": "Event",
    "@id": url,
    url,
    name: tx(e.title, o.locale),
    description: metaDescription(tx(e.description, o.locale)) ?? metaDescription(`${o.sevaLabel} · ${e.venue.name}, ${e.venue.address}`),
    startDate: e.postponedTo ?? e.startsAt,
    ...(e.endsAt ? { endDate: e.endsAt } : {}),
    eventStatus: `https://schema.org/${status}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: true,
    inLanguage: o.locale,
    location: {
      "@type": "Place",
      name: e.venue.name,
      address: { "@type": "PostalAddress", streetAddress: e.venue.address, addressRegion: "Delhi NCR", addressCountry: "IN" },
      ...(e.venue.geo ? { geo: { "@type": "GeoCoordinates", latitude: e.venue.geo.lat, longitude: e.venue.geo.lng } } : {}),
    },
    organizer: orgRef(o.base, o.orgName),
    offers: { "@type": "Offer", price: 0, priceCurrency: "INR", availability: "https://schema.org/InStock", url },
  };
}

export function discourseSchema(d: DiscourseDetail, o: { base: string; locale: AppLocale; orgName: string }) {
  const url = localeUrl(o.base, o.locale, `/discourses/${encodeURIComponent(d.slug)}`);
  const iso = /^\d{4}-\d{2}-\d{2}/.test(d.date) ? d.date.slice(0, 10) : undefined;
  return {
    "@type": "Article",
    "@id": url,
    url,
    mainEntityOfPage: url,
    headline: tx(d.title, o.locale).slice(0, 110),
    description: metaDescription(tx(d.why, o.locale)),
    ...(iso ? { dateCreated: iso } : {}),
    inLanguage: o.locale,
    author: { "@type": "Person", name: "Bhagawan Sri Sathya Sai Baba" },
    publisher: orgRef(o.base, o.orgName),
    isPartOf: { "@type": "Collection", name: d.source.coll },
    ...(d.source.url ? { isBasedOn: d.source.url } : {}),
  };
}
