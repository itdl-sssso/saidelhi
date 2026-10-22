import { useLocale, useTranslations } from "next-intl";
import type { EventAdmin, EventStatus, Permission, TimelineStep } from "@/contract";
import { SEVA_ICON } from "@/features/public/seva";
import { type AppLocale, formatDate, formatDateLong, formatTimeRange, pickText, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { FigureValue } from "@/ui/Figure";
import { Icon } from "@/ui/Icon";
import { StatusPill } from "@/ui/StatusPill";
import { PageHead, Panel, Pill, SourceBadge } from "../kit";
import { fmtDateTime, fmtShortDateTime } from "../time";
import { EventActions } from "./EventActions";
import { EventLinksPanel } from "./EventLinksPanel";
import { controlsFor, effectiveStatus, hasPublicPage } from "./lifecycle";
import styles from "../Admin.module.css";
import ev from "./Event.module.css";

const SEQUENCE = ["draft", "awaiting_approval", "planned", "event_day", "awaiting_report", "report_submitted", "approved"] as const;
type StepId = (typeof SEQUENCE)[number];

function currentIndex(status: EventStatus, eff: EventStatus): number {
  if (status === "approved") return SEQUENCE.length;
  if (status === "cancelled") return -1;
  const e = status === "postponed" ? "planned" : eff;
  const at: Partial<Record<EventStatus, StepId>> = { draft: "draft", awaiting_approval: "awaiting_approval", planned: "planned", awaiting_report: "awaiting_report", report_submitted: "report_submitted" };
  const id = at[e];
  return id ? SEQUENCE.indexOf(id) : 0;
}

function Lifecycle({ event }: { event: EventAdmin }) {
  const t = useTranslations("admin.event");
  const tStatus = useTranslations("status");
  const tChannel = useTranslations("admin.channel");
  const locale = useLocale() as AppLocale;
  const eff = effectiveStatus(event);
  const cur = currentIndex(event.status, eff);
  const byId = new Map<string, TimelineStep>();
  for (const s of event.timeline) if (s.at) byId.set(s.status, s);
  const escalated = byId.get("escalated");
  return (
    <Panel title={t("lifecycle")}>
      <ol className={ev.steps} aria-label={t("lifecycle")}>
        {SEQUENCE.map((id, i) => {
          const s = byId.get(id);
          const state = event.status === "cancelled" ? (s ? "done" : "upcoming") : i < cur ? "done" : i === cur ? "current" : "upcoming";
          const who = s?.by?.label;
          const via = s?.channel ? tChannel(s.channel) : null;
          return (
            <li key={id} className={`${ev.step} ${ev[state]}`} aria-current={state === "current" ? "step" : undefined}>
              <span className={ev.num} aria-hidden="true">
                {state === "done" ? <Icon name="check" size={16} /> : i + 1}
              </span>
              <span className={ev.stepBody}>
                <span className={ev.stepLabel}>{id === "event_day" ? t("eventDay") : tStatus(id)}</span>
                {s?.at ? (
                  <span className={ev.stepMeta}>
                    {fmtShortDateTime(s.at, locale)}
                    {who || via ? <br /> : null}
                    {[via, who].filter(Boolean).join(" · ")}
                  </span>
                ) : state === "current" ? (
                  <span className={ev.stepMeta}>{t("waiting")}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {escalated ? (
        <div className={ev.branch}>
          <Icon name="triangle-alert" size={18} />
          <span>
            {t("escalatedAt", { date: fmtShortDateTime(escalated.at as string, locale) })}
            {event.status === "escalated" ? ` ${t("escalatedNow")}` : ""}
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

function PlanDetails({ event }: { event: EventAdmin }) {
  const t = useTranslations("admin.event");
  const locale = useLocale() as AppLocale;
  const hi = event.description.hi?.trim();
  return (
    <Panel title={t("plan")}>
      <dl className={styles.dl}>
        <dt>{t("volunteers")}</dt>
        <dd>{event.volunteersNeeded === null ? "—" : `${event.volunteersJoined} / ${event.volunteersNeeded}`}</dd>
        <dt>{t("partner")}</dt>
        <dd>{event.partner?.name ?? "—"}</dd>
        <dt>{t("recurring")}</dt>
        <dd>{event.recurring ? t("yes") : t("no")}</dd>
      </dl>
      <div className={styles.col} style={{ gap: 6 }}>
        <span className={styles.cap}>{t("descEn")}</span>
        <p className={styles.sub} style={{ color: "var(--slate-800)" }}>
          {event.description.en || "—"}
        </p>
        <span className={styles.cap}>{t("descHi")}</span>
        {hi ? (
          <p className={styles.sub} lang="hi" style={{ color: "var(--slate-800)" }}>
            {hi}
          </p>
        ) : (
          <Alert tone="attention">{t("descHiMissing")}</Alert>
        )}
        {event.bring.length ? (
          <>
            <span className={styles.cap}>{t("bring")}</span>
            <p className={styles.sub}>{event.bring.map((b) => pickText(b, locale).text).join(" · ")}</p>
          </>
        ) : null}
      </div>
    </Panel>
  );
}

function Submissions({ event }: { event: EventAdmin }) {
  const t = useTranslations("admin.event");
  const tSub = useTranslations("admin.submission");
  const locale = useLocale() as AppLocale;
  return (
    <Panel title={t("submissions")}>
      {event.submissions.length === 0 ? (
        <EmptyState icon="clipboard-list" title={t("noSubmissions")} body={t("noSubmissionsBody")} />
      ) : (
        <>
          {event.submissions.map((s) => (
            <div className={ev.sub} key={s.id}>
              <div className={styles.row} style={{ justifyContent: "space-between" }}>
                <span className={styles.row}>
                  <b className={styles.strong}>{s.linkLabel}</b>
                  <SourceBadge source={s.source} />
                </span>
                <Pill tone={s.status === "approved" ? "green" : s.status === "changes_requested" ? "pink" : "yellow"}>{tSub(s.status)}</Pill>
              </div>
              <span className={styles.cap}>
                {fmtDateTime(s.submittedAt, locale)} · {t("verifiedPhone")} {s.submittedBy}
              </span>
            </div>
          ))}
          {event.results && event.results.tiles.length ? (
            <dl className={styles.dl}>
              {event.results.tiles.map((tile) => (
                <div key={tile.key} style={{ display: "contents" }}>
                  <dt>{tx(tile.label, locale)}</dt>
                  <dd>
                    <FigureValue value={tile.figure.value} inline />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      )}
    </Panel>
  );
}

function ResultsPreview({ event }: { event: EventAdmin }) {
  const t = useTranslations("admin.event");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const r = event.results;
  return (
    <Panel title={t("resultsPreview")} action={<span className={styles.cap}>{t("resultsNote")}</span>}>
      {!r || r.tiles.length === 0 ? (
        <p className={styles.sub}>{t("resultsEmpty")}</p>
      ) : (
        <div className={ev.pub}>
          <span className={styles.eyebrow}>
            {tSeva(event.sevaType)} · {tx(event.district.name, locale)}
          </span>
          <h3 className={ev.pubTitle}>{tx(event.title, locale)}</h3>
          <div className={ev.tiles}>
            {r.tiles.map((tile) => (
              <div className={ev.tile} key={tile.key}>
                <b>
                  <FigureValue value={tile.figure.value} inline />
                </b>
                <span>{tx(tile.label, locale)}</span>
              </div>
            ))}
          </div>
          <span className={styles.cap}>
            {formatDate(event.startsAt, locale)} · {t("peopleNote")}
          </span>
        </div>
      )}
    </Panel>
  );
}

const sizeText = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Attachments({ event, canView }: { event: EventAdmin; canView: boolean }) {
  const t = useTranslations("admin.event");
  const locale = useLocale() as AppLocale;
  return (
    <Panel title={t("attachments")}>
      {event.attachments.length === 0 ? (
        <p className={styles.sub}>{t("noAttachments")}</p>
      ) : (
        event.attachments.map((a) => (
          <div className={ev.file} key={a.id}>
            <span className={ev.fileTh}>
              <Icon name={a.mime.startsWith("image/") ? "image" : "file-text"} size={20} />
            </span>
            <div className={styles.col} style={{ flex: 1, gap: 2 }}>
              <span className={styles.strong} style={{ overflowWrap: "anywhere" }}>
                {a.name}
              </span>
              <span className={styles.cap} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <Icon name="lock" size={16} />
                {t("privateNote")} · {sizeText(a.size)} · {formatDate(a.uploadedAt, locale)}
              </span>
            </div>
            {canView ? (
              <Button href={a.url} external variant="ghost" size="sm">
                {t("view")}
              </Button>
            ) : null}
          </div>
        ))
      )}
      {event.followUpCount !== null ? (
        <div className={styles.lock}>
          <Icon name="lock" size={18} />
          <span>
            <b>{t("followUp", { count: event.followUpCount })}</b> {t("followUpNote")}
          </span>
        </div>
      ) : null}
    </Panel>
  );
}

function Activity({ event }: { event: EventAdmin }) {
  const t = useTranslations("admin.event");
  const tStatus = useTranslations("status");
  const locale = useLocale() as AppLocale;
  const items: Array<{ at: string; text: string }> = [];
  for (const s of event.timeline) {
    if (!s.at) continue;
    const name = s.status === "event_day" ? t("eventDay") : tStatus(s.status);
    items.push({ at: s.at, text: s.by ? t("activityStatusBy", { status: name, who: s.by.label }) : t("activityStatus", { status: name }) });
  }
  for (const l of event.links) if (l.lastOpenedAt) items.push({ at: l.lastOpenedAt, text: t("activityOpened", { label: l.label }) });
  for (const s of event.submissions) items.push({ at: s.submittedAt, text: t("activitySubmitted", { label: s.linkLabel, phone: s.submittedBy }) });
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <Panel title={t("activity")}>
      {items.length === 0 ? (
        <p className={styles.sub}>{t("noActivity")}</p>
      ) : (
        <ol className={styles.log}>
          {items.slice(0, 25).map((i, n) => (
            <li key={n}>
              <time dateTime={i.at}>{fmtShortDateTime(i.at, locale)}</time>
              <span>{i.text}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export function EventDetail({ event, perms }: { event: EventAdmin; perms: Permission[] }) {
  const t = useTranslations("admin.event");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const controls = controlsFor(event, perms);
  const when = `${formatDateLong(event.startsAt, locale)} · ${formatTimeRange(event.startsAt, event.endsAt, locale)}`;
  const can = (p: Permission) => perms.includes(p);
  return (
    <div className={styles.page}>
      <PageHead back={{ href: "/admin/events", label: t("back") }} title={tx(event.title, locale)} actions={<StatusPill status={event.status} size="lg" />} />
      <div className={`${styles.card} ${ev.hdr}`}>
        <div className={ev.hdrRow}>
          <div className={ev.hdrMain}>
            <div className={styles.meta}>
              <span>
                <Icon name={SEVA_ICON[event.sevaType]} size={16} />
                {tSeva(event.sevaType)}
              </span>
              <span>
                <Icon name="calendar-days" size={16} />
                {when}
              </span>
              <span>
                <Icon name="map-pin" size={16} />
                {[event.venue.name, event.venue.address].filter(Boolean).join(", ")}
              </span>
              <span>
                <Icon name="house" size={16} />
                {tx(event.samithi.name, locale)} · {tx(event.district.name, locale)}
              </span>
            </div>
            {event.status === "postponed" && event.postponedTo ? (
              <Alert tone="attention">{t("postponedTo", { date: fmtDateTime(event.postponedTo, locale) })}</Alert>
            ) : null}
            {event.status === "cancelled" ? <Alert tone="note">{t("cancelledNote")}</Alert> : null}
            {event.status === "approved" ? <Alert tone="success">{t("approvedNote")}</Alert> : null}
            {event.status === "escalated" ? <Alert tone="attention">{t("escalatedBanner")}</Alert> : null}
          </div>
          <EventActions id={event.id} version={event.version} controls={controls} publicHref={hasPublicPage(event.status) ? `/events/${event.id}` : null} />
        </div>
      </div>
      <Lifecycle event={event} />
      <div className={`${styles.grid} ${styles.gMain}`}>
        <div className={ev.mainCol}>
          <EventLinksPanel eventId={event.id} links={event.links} open={controls.linksOpen} canManage={can("links.manage")} />
          <Submissions event={event} />
          <ResultsPreview event={event} />
        </div>
        <div className={ev.mainCol}>
          <PlanDetails event={event} />
          <Attachments event={event} canView={can("attachments.read")} />
          <Activity event={event} />
        </div>
      </div>
    </div>
  );
}
