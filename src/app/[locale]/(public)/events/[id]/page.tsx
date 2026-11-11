import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EventView } from "@/features/event/EventView";
import { getEvent } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { formatDate, pickText } from "@/lib/format";
import { metaDescription, pageAlternates } from "@/features/seo/meta";
import { JsonLd } from "@/features/seo/JsonLd";
import { eventSchema } from "@/features/seo/schema";
import { env } from "@/server/env";

export async function generateMetadata({ params }: PageProps<"/[locale]/events/[id]">): Promise<Metadata> {
  const locale = await initLocale();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) {
    const t = await getTranslations({ locale, namespace: "errors" });
    return { title: t("notFoundTitle") };
  }
  const t = await getTranslations({ locale, namespace: "seva" });
  const title = pickText(event.title, locale).text;
  const description = metaDescription(pickText(event.description, locale).text) ?? metaDescription(`${t(event.sevaType)} · ${event.venue.name}, ${event.venue.address}`) ?? title;
  return {
    title: `${title} · ${formatDate(event.startsAt, locale)}`,
    description,
    openGraph: { title, description, type: "article" },
    alternates: pageAlternates(locale, `/events/${id}`),
  };
}

async function EventContent({ params }: PageProps<"/[locale]/events/[id]">) {
  const locale = await initLocale();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  const [tm, ts] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getTranslations({ locale, namespace: "seva" })]);
  return (
    <>
      <JsonLd
        data={eventSchema(event, { base: env().APP_URL, locale, orgName: `${tm("orgName")}, ${tm("region")}`, sevaLabel: ts(event.sevaType) })}
      />
      <EventView event={event} />
    </>
  );
}

export default function EventPage(props: PageProps<"/[locale]/events/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EventContent {...props} />
    </Suspense>
  );
}
