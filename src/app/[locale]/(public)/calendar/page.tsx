import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { SevaType } from "@/contract";
import { CalendarView } from "@/features/calendar/CalendarView";
import { type CalendarState, monthBounds, parseCalendarParams } from "@/features/calendar/model";
import { type EventsFilter, getCentres, getEvents } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { istDateKey, tx } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "calendar" });
  return { title: t("metaTitle"), description: t("lead") };
}

const LIST_PAGE_SIZE = 50;

function filterFor(state: CalendarState, today: string): EventsFilter {
  const base: EventsFilter = {
    district: state.district ?? undefined,
    samithi: state.samithi ?? undefined,
    sevaType: state.sevaType ?? undefined,
    needsVolunteers: state.volunteers || undefined,
  };
  return state.view === "month" ? { ...base, ...monthBounds(state.month) } : { ...base, from: today };
}

async function CalendarContent({ searchParams }: PageProps<"/[locale]/calendar">) {
  const locale = await initLocale();
  const sp = await searchParams;
  // "Today" in IST is per request.
  await connection();
  const today = istDateKey(new Date());
  const state = parseCalendarParams(sp, today);

  const [t, centres, events] = await Promise.all([
    getTranslations({ locale, namespace: "seva" }),
    getCentres(),
    state.view === "month"
      ? getEvents(filterFor(state, today), 1, 100)
      : getEvents(filterFor(state, today), state.page, LIST_PAGE_SIZE),
  ]);

  // Districts and samithis that have a public centre; the URL keeps their slugs.
  const districts = new Map<string, string>();
  const samithis = new Map<string, { label: string; district: string }>();
  for (const c of centres) {
    districts.set(c.district.slug, tx(c.district.name, locale));
    samithis.set(c.samithi.slug, { label: tx(c.samithi.name, locale), district: c.district.slug });
  }
  const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, locale);

  return (
    <CalendarView
      state={state}
      today={today}
      events={events.data}
      total={events.meta.total}
      pageSize={state.view === "month" ? 100 : LIST_PAGE_SIZE}
      districts={[...districts].map(([value, label]) => ({ value, label })).sort(byLabel)}
      samithis={[...samithis].map(([value, s]) => ({ value, ...s })).sort(byLabel)}
      sevaTypes={SevaType.options.map((value) => ({ value, label: t(value) }))}
    />
  );
}

export default function CalendarPage(props: PageProps<"/[locale]/calendar">) {
  return (
    <Suspense fallback={<Loading />}>
      <CalendarContent {...props} />
    </Suspense>
  );
}
