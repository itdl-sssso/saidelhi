import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EventView } from "@/features/event/EventView";
import { getEvent } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { formatDate, pickText } from "@/lib/format";

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
  const description = pickText(event.description, locale).text || `${t(event.sevaType)} · ${event.venue.name}`;
  return {
    title: `${title} · ${formatDate(event.startsAt, locale)}`,
    description,
    openGraph: { title, description, type: "article" },
  };
}

async function EventContent({ params }: PageProps<"/[locale]/events/[id]">) {
  await initLocale();
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  return <EventView event={event} />;
}

export default function EventPage(props: PageProps<"/[locale]/events/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <EventContent {...props} />
    </Suspense>
  );
}
