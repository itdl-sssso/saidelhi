import { useLocale, useTranslations } from "next-intl";
import type { EventPublic } from "@/contract";
import { Link } from "@/i18n/navigation";
import {
  type AppLocale,
  dateParts,
  formatDateLong,
  formatDayMonth,
  formatMonthYear,
  formatTime,
  istDateKey,
  monthName,
  pickText,
  tx,
  weekdayName,
} from "@/lib/format";
import { PageHero, pub } from "@/features/public/parts";
import { SEVA_ICON, volunteersStillNeeded } from "@/features/public/seva";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Pagination } from "@/ui/Pagination";
import { StatusPill } from "@/ui/StatusPill";
import { CalendarFilters, type Option, type SamithiOption } from "./CalendarFilters";
import { type CalendarState, activeFilterCount, calendarQuery, groupByDay, monthGrid, shiftMonth } from "./model";
import styles from "./Calendar.module.css";

export type CalendarViewProps = {
  state: CalendarState;
  today: string;
  events: EventPublic[];
  total: number;
  pageSize: number;
  districts: Option[];
  samithis: SamithiOption[];
  sevaTypes: Option[];
};

const toQuery = (state: CalendarState, today: string, patch: Partial<CalendarState>) =>
  calendarQuery({ ...state, ...patch }, today);

export function CalendarView(props: CalendarViewProps) {
  const { state, today } = props;
  const t = useTranslations("calendar");

  return (
    <>
      <PageHero>
        <div className={styles.headRow}>
          <div className={pub.col}>
            <h1 className={pub.h1}>{t("title")}</h1>
            <p className={pub.lead}>{t("lead")}</p>
          </div>
          <nav className={pub.seg} aria-label={t("viewLabel")}>
            <Link
              href={{ pathname: "/calendar", query: toQuery(state, today, { view: "list", page: 1, day: null }) }}
              aria-current={state.view === "list" ? "true" : undefined}
              scroll={false}
            >
              <Icon name="list" size={16} />
              {t("viewList")}
            </Link>
            <Link
              href={{ pathname: "/calendar", query: toQuery(state, today, { view: "month", day: null }) }}
              aria-current={state.view === "month" ? "true" : undefined}
              scroll={false}
            >
              <Icon name="calendar-days" size={16} />
              {t("viewMonth")}
            </Link>
          </nav>
        </div>
        <CalendarFilters
          state={state}
          today={today}
          districts={props.districts}
          samithis={props.samithis}
          sevaTypes={props.sevaTypes}
        />
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-4)" }}>
        <div className={cx(pub.wrap, styles.body)}>
          {state.view === "month" ? <MonthView {...props} /> : <ListView {...props} />}
          <WhatsAppNote />
          <p className={styles.tzNote}>
            <Icon name="clock" size={16} />
            {t("timezoneNote")}
          </p>
        </div>
      </section>
    </>
  );
}

function NoResults({ state, today }: { state: CalendarState; today: string }) {
  const t = useTranslations("calendar");
  const filtered = activeFilterCount(state) > 0;
  return (
    <div className={pub.card}>
      <EmptyState
        icon="calendar-search"
        headingLevel={2}
        title={filtered ? t("noMatchTitle") : t("nothingTitle")}
        body={filtered ? t("noMatchBody") : t("nothingBody")}
        action={
          filtered ? (
            <Button
              href={`/calendar${state.view === "month" ? `?view=month${state.month !== today.slice(0, 7) ? `&month=${state.month}` : ""}` : ""}`}
              variant="outline"
              icon="x"
            >
              {t("clearFilters")}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

function ListView({ state, today, events, total, pageSize }: CalendarViewProps) {
  const t = useTranslations("calendar");
  const locale = useLocale() as AppLocale;
  if (events.length === 0) return <NoResults state={state} today={today} />;
  const days = [...groupByDay(events)];
  const tomorrow = istDateKey(new Date(Date.parse(`${today}T12:00:00+05:30`) + 86_400_000));
  return (
    <div>
      <p className={pub.cap}>{t("shareNote")}</p>
      <ol className={styles.days}>
        {days.map(([key, list]) => {
          const p = dateParts(key);
          const rel = key === today ? t("today") : key === tomorrow ? t("tomorrow") : weekdayName(p.dow, locale);
          return (
            <li key={key} className={styles.day}>
              <h2 className={styles.dayHead}>
                <b>
                  {p.d} {monthName(p.m, locale)}
                </b>
                <span>{rel}</span>
              </h2>
              <ul className={styles.rows}>
                {list.map((e) => (
                  <EventRow key={e.id} event={e} today={today} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      {total > pageSize ? (
        <Pagination
          page={state.page}
          pageSize={pageSize}
          total={total}
          className={styles.pager}
          href={(page) => {
            const q = new URLSearchParams(toQuery(state, today, { page }));
            const s = q.toString();
            return s ? `/calendar?${s}` : "/calendar";
          }}
        />
      ) : null}
    </div>
  );
}

/** One event: time, seva icon, title, samithi · district, and a state badge. */
function EventRow({ event, today, compact }: { event: EventPublic; today: string; compact?: boolean }) {
  const t = useTranslations("calendar");
  const ts = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const title = pickText(event.title, locale);
  const cancelled = event.status === "cancelled";
  const needed = volunteersStillNeeded(event);
  const past = istDateKey(event.startsAt) < today;

  let badge = null;
  if (cancelled || event.status === "postponed") {
    badge = <StatusPill status={event.status} />;
  } else if (needed !== null) {
    badge = (
      <span className={pub.volb}>
        <Icon name="hand-heart" size={16} />
        {t("volunteersNeeded", { count: needed })}
      </span>
    );
  } else if (event.status === "approved") {
    badge = (
      <span className={styles.results}>
        <Icon name="chart-column" size={16} />
        {t("seeResults")}
      </span>
    );
  } else if (past) {
    badge = <StatusPill status={event.status} />;
  }

  return (
    <li>
      <Link
        // Weekly gatherings (id gath_*) have no event page: they link to the centre.
        href={event.recurring ? `/centres/${event.centre?.slug ?? event.samithi.slug}` : `/events/${event.id}`}
        className={cx(
          styles.row,
          compact && styles.rowCompact,
          event.recurring && styles.rowRecurring,
          cancelled && styles.rowCancelled,
        )}
      >
        <span className={styles.time}>
          {cancelled ? <del>{formatTime(event.startsAt, locale)}</del> : formatTime(event.startsAt, locale)}
        </span>
        <span className={styles.ic}>
          <Icon name={SEVA_ICON[event.sevaType]} size={18} />
        </span>
        <span className={styles.main}>
          <span className={cx(styles.title, cancelled && pub.strike)} lang={title.fallback ? "en" : undefined}>
            {title.text}
          </span>
          <span className={styles.meta}>
            {ts(event.sevaType)} · {tx(event.samithi.name, locale)} · {t("districtName", { name: tx(event.district.name, locale) })}
            {event.recurring ? ` · ${t("everyWeek")}` : ""}
          </span>
          {event.status === "postponed" && event.postponedTo ? (
            <span className={styles.meta}>{t("newDate", { date: formatDayMonth(event.postponedTo, locale) })}</span>
          ) : null}
        </span>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </Link>
    </li>
  );
}

function MonthView({ state, today, events }: CalendarViewProps) {
  const t = useTranslations("calendar");
  const locale = useLocale() as AppLocale;
  const byDay = groupByDay(events);
  const grid = monthGrid(state.month);
  const [y, m] = state.month.split("-").map(Number);
  const inMonthToday = today.startsWith(state.month);
  const firstWithEvents = [...byDay.keys()].find((k) => k.startsWith(state.month)) ?? null;
  const selected = state.day && state.day.startsWith(state.month) ? state.day : inMonthToday ? today : (firstWithEvents ?? `${state.month}-01`);
  const selectedEvents = byDay.get(selected) ?? [];
  const weekdays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className={styles.month}>
      <div className={styles.monthBar}>
        <div className={styles.monthNav}>
          <Link
            href={{ pathname: "/calendar", query: toQuery(state, today, { month: shiftMonth(state.month, -1), day: null }) }}
            className={styles.iconBtn}
            aria-label={t("prevMonth")}
            scroll={false}
          >
            <Icon name="chevron-left" size={20} />
          </Link>
          <h2 className={styles.monthTitle} aria-live="polite">
            {formatMonthYear(y, m, locale)}
          </h2>
          <Link
            href={{ pathname: "/calendar", query: toQuery(state, today, { month: shiftMonth(state.month, 1), day: null }) }}
            className={styles.iconBtn}
            aria-label={t("nextMonth")}
            scroll={false}
          >
            <Icon name="chevron-right" size={20} />
          </Link>
          {inMonthToday ? null : (
            <Link
              href={{ pathname: "/calendar", query: toQuery(state, today, { month: today.slice(0, 7), day: null }) }}
              className={styles.todayLink}
              scroll={false}
            >
              {t("today")}
            </Link>
          )}
        </div>
        <ul className={styles.legend} aria-label={t("legendLabel")}>
          <li>
            <i className={styles.swSeva} />
            {t("legendSeva")}
          </li>
          <li>
            <i className={styles.swVol} />
            {t("filterVolunteers")}
          </li>
          <li>
            <i className={styles.swRec} />
            {t("legendWeekly")}
          </li>
          <li>
            <i className={styles.swX} />
            {t("legendCancelled")}
          </li>
        </ul>
      </div>

      {events.length === 0 && activeFilterCount(state) > 0 ? <NoResults state={state} today={today} /> : null}

      <div className={styles.monthLayout}>
        <table className={styles.grid}>
          <caption className="sr-only">{formatMonthYear(y, m, locale)}</caption>
          <thead>
            <tr>
              {weekdays.map((d) => (
                <th key={d} scope="col" abbr={weekdayName(d, locale)}>
                  {weekdayName(d, locale, "short")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: grid.length / 7 }, (_, w) => (
              <tr key={w}>
                {grid.slice(w * 7, w * 7 + 7).map((c) => {
                  const list = c.inMonth ? (byDay.get(c.key) ?? []) : [];
                  const label = `${formatDateLong(`${c.key}T12:00:00+05:30`, locale)}: ${t("eventsCount", { count: list.length })}`;
                  return (
                    <td
                      key={c.key}
                      className={cx(
                        styles.cell,
                        !c.inMonth && styles.cellOut,
                        c.key === today && styles.cellToday,
                        c.key === selected && styles.cellSel,
                      )}
                    >
                      {c.inMonth ? (
                        <Link
                          href={{ pathname: "/calendar", query: toQuery(state, today, { day: c.key }) }}
                          className={styles.cellLink}
                          aria-label={label}
                          aria-current={c.key === selected ? "date" : undefined}
                          scroll={false}
                        >
                          <span className={styles.cellDay}>{c.day}</span>
                          <span className={styles.pills} aria-hidden="true">
                            {list.slice(0, 3).map((e) => (
                              <span key={e.id} className={cx(styles.pill, pillClass(e))}>
                                {tx(e.title, locale)}
                              </span>
                            ))}
                            {list.length > 3 ? <span className={styles.morePill}>{t("more", { count: list.length - 3 })}</span> : null}
                          </span>
                          <span className={styles.dots} aria-hidden="true">
                            {list.slice(0, 4).map((e) => (
                              <i key={e.id} className={pillClass(e)} />
                            ))}
                          </span>
                        </Link>
                      ) : (
                        <span className={styles.cellDay} aria-hidden="true">
                          {c.day}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <aside className={cx(pub.card, styles.side)} aria-labelledby="day-heading">
          <div className={styles.sideDate}>
            <span className={styles.sideNum}>{dateParts(selected).d}</span>
            <span>
              <b>{weekdayName(dateParts(selected).dow, locale)}</b>
              <br />
              {formatMonthYear(y, m, locale)}
            </span>
          </div>
          <h2 id="day-heading" className="sr-only">
            {formatDateLong(`${selected}T12:00:00+05:30`, locale)}
          </h2>
          {selectedEvents.length ? (
            <ul className={styles.rows}>
              {selectedEvents.map((e) => (
                <EventRow key={e.id} event={e} today={today} compact />
              ))}
            </ul>
          ) : (
            <p className={pub.small}>{t("nothingThisDay")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function pillClass(e: EventPublic): string {
  if (e.status === "cancelled") return styles.pillX;
  if (e.recurring) return styles.pillRec;
  if (volunteersStillNeeded(e) !== null) return styles.pillVol;
  return styles.pillSeva;
}

function WhatsAppNote() {
  const t = useTranslations("calendar");
  return (
    <div className={styles.wa}>
      <span className={pub.icwell}>
        <Icon name="message-circle" size={20} />
      </span>
      <p className={pub.small}>
        <b className={styles.waTitle}>{t("waTitle")}</b> {t("waBody")}
      </p>
      <Button href="/centres/map" variant="secondary" size="sm" iconAfter="arrow-right">
        {t("waCta")}
      </Button>
    </div>
  );
}
