"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { type EventAdmin, type EventFromMessage, type EventInput, type PlanField, type SevaType, SevaType as SevaTypeEnum, adminEndpoints } from "@/contract";
import { SEVA_ICON } from "@/features/public/seva";
import { useRouter } from "@/i18n/navigation";
import { type AppLocale, formatDateLong, formatTimeRange } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Input, Textarea } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { DayChip, Panel } from "../kit";
import { toLocalInput } from "../time";
import { useAction } from "../useAction";
import styles from "../Admin.module.css";
import ev from "./Event.module.css";

export interface SamithiOption {
  value: string;
  label: string;
  districtLabel?: string;
}

type Errors = Record<string, string>;

const iso = (date: string, time: string) => (date && time ? `${date}T${time}:00+05:30` : "");

function initialState(e: EventAdmin | undefined, samithi: string) {
  const [d = "", st = ""] = toLocalInput(e?.startsAt ?? null).split("T");
  const en = e?.endsAt ? toLocalInput(e.endsAt).split("T")[1] : "";
  return {
    sevaType: (e?.sevaType ?? "eye") as SevaType,
    titleEn: e?.title.en ?? "",
    titleHi: e?.title.hi ?? "",
    titleTouched: !!e,
    date: d,
    start: st || "09:00",
    end: en || "",
    samithiId: e?.samithi.id ?? samithi,
    venueName: e?.venue.name ?? "",
    venueAddress: e?.venue.address ?? "",
    volunteers: e?.volunteersNeeded != null ? String(e.volunteersNeeded) : "",
    bring: (e?.bring ?? []).map((b) => b.en).join("\n"),
    descEn: e?.description.en ?? "",
    descHi: e?.description.hi ?? "",
  };
}

/** Form fields filled from a message; `check` lists the ones to look at. */
function applyPrefill(s: ReturnType<typeof initialState>, p: EventFromMessage, samithis: SamithiOption[]): ReturnType<typeof initialState> {
  const v = p.prefill;
  return {
    ...s,
    sevaType: v.sevaType ?? s.sevaType,
    titleEn: v.title ?? s.titleEn,
    titleTouched: v.title ? true : s.titleTouched,
    date: v.date ?? s.date,
    start: v.startTime ?? s.start,
    end: v.endTime ?? s.end,
    samithiId: v.samithiId && samithis.some((x) => x.value === v.samithiId) ? v.samithiId : s.samithiId,
    venueName: v.venueName ?? s.venueName,
    venueAddress: v.venueAddress ?? s.venueAddress,
    volunteers: v.volunteersNeeded != null ? String(v.volunteersNeeded) : s.volunteers,
    bring: v.bring.length ? v.bring.join("\n") : s.bring,
    descEn: v.description || s.descEn,
  };
}

const CHECK_LABEL: Record<PlanField, "seva" | "title" | "date" | "ends" | "samithi" | "venue" | "address" | "volunteers" | "bring" | "descEn"> = {
  sevaType: "seva",
  title: "title",
  startsAt: "date",
  endsAt: "ends",
  samithiId: "samithi",
  venueName: "venue",
  venueAddress: "address",
  volunteersNeeded: "volunteers",
  bring: "bring",
  description: "descEn",
};

export function EventForm({
  event,
  samithis,
  defaultSamithi,
  prefill,
}: {
  event?: EventAdmin;
  samithis: SamithiOption[];
  defaultSamithi: string;
  /** Read from an inbox item's message (`?from=<inboxId>`). */
  prefill?: EventFromMessage | null;
}) {
  const t = useTranslations("admin.form");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { run, pending } = useAction();
  const [f, setF] = useState(() => {
    const s = initialState(event, defaultSamithi);
    return prefill ? applyPrefill(s, prefill, samithis) : s;
  });
  const [message, setMessage] = useState("");
  const [check, setCheck] = useState<PlanField[] | null>(prefill?.check ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [previewLang, setPreviewLang] = useState<AppLocale>(locale);
  const formRef = useRef<HTMLFormElement>(null);
  const isDraftish = !event || event.status === "draft";

  const samithiLabel = samithis.find((s) => s.value === f.samithiId)?.label ?? "";
  const suggested = samithiLabel ? t("titleSuggestion", { seva: tSeva(f.sevaType), samithi: samithiLabel }) : tSeva(f.sevaType);
  const titleEn = f.titleTouched ? f.titleEn : suggested;

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => {
      if (!(k in e)) return e;
      const rest = { ...e };
      delete rest[k as string];
      return rest;
    });
  };

  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const body = useMemo<EventInput & { description: { en: string; hi: string | null } }>(
    () => ({
      sevaType: f.sevaType,
      title: { en: titleEn.trim(), hi: f.titleHi.trim() || null },
      startsAt: iso(f.date, f.start),
      endsAt: f.end ? iso(f.date, f.end) : null,
      samithiId: f.samithiId,
      venueName: f.venueName.trim(),
      venueAddress: f.venueAddress.trim(),
      volunteersNeeded: f.volunteers ? Number(f.volunteers) : null,
      bring: f.bring
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((en) => ({ en, hi: null })),
      description: { en: f.descEn.trim(), hi: f.descHi.trim() || null },
    }),
    [f, titleEn],
  );

  const validate = (submit: boolean): Errors => {
    const e: Errors = {};
    if (!body.title.en) e["title.en"] = t("errTitle");
    if (!f.date) e.startsAt = t("errDate");
    if (f.end && f.end <= f.start) e.endsAt = t("errEnds");
    if (!f.samithiId) e.samithiId = t("errSamithi");
    if (!body.venueName) e.venueName = t("errVenue");
    if (submit || !isDraftish) {
      if (!body.description.en) e["description.en"] = t("errDescEn");
      if (!body.description.hi) e["description.hi"] = t("errDescHi");
    }
    return e;
  };

  const save = async (submit: boolean) => {
    const local = validate(submit);
    setErrors(local);
    if (Object.keys(local).length) return;
    if (!event) {
      const res = await run<EventAdmin>(adminEndpoints.events(), { body: { ...body, submit } }, { key: submit ? "submit" : "draft", quiet422: true, refresh: false, success: submit ? t("submitted") : t("saved") });
      if (res.ok) router.push(`/admin/events/${res.data.id}`);
      else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
      return;
    }
    const res = await run<EventAdmin>(adminEndpoints.event(event.id), { method: "PATCH", body: { ...body, version: event.version } }, { key: submit ? "submit" : "draft", quiet422: true, refresh: false });
    if (!res.ok) {
      if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
      return;
    }
    if (submit) {
      const sub = await run(adminEndpoints.eventAction(event.id, "submit"), { body: { version: res.data.version } }, { key: "submit", quiet422: true, refresh: false, success: t("submitted") });
      if (!sub.ok) {
        if (sub.status === 422) setErrors(sub.error.fields ?? { form: sub.error.message });
        return;
      }
    }
    router.push(`/admin/events/${event.id}`);
    router.refresh();
  };

  const fillFromMessage = async () => {
    const res = await run<EventFromMessage>(adminEndpoints.eventFromMessage(), { body: { text: message } }, { key: "extract", refresh: false });
    if (!res.ok) return;
    setF((s) => applyPrefill(s, res.data, samithis));
    setCheck(res.data.check);
    setErrors({});
  };

  const errCount = Object.keys(errors).length;
  const pv = previewLang;
  const previewTitle = (pv === "hi" && f.titleHi.trim()) || titleEn || t("untitled");
  const previewDesc = (pv === "hi" ? f.descHi.trim() : f.descEn.trim()) || t("previewNoDesc");
  const previewStart = f.date && f.start ? iso(f.date, f.start) : null;

  return (
    <form ref={formRef} className={`${styles.grid} ${styles.gMain}`} onSubmit={(e) => e.preventDefault()} noValidate>
      <div className={ev.mainCol}>
        {errCount ? (
          <Alert tone="error" title={t("fixErrors", { count: errCount })}>
            {errors.form ?? t("fixErrorsBody")}
          </Alert>
        ) : null}
        {!event ? (
          <Panel title={t("fromMessage.title")}>
            <Textarea
              label={t("fromMessage.label")}
              hint={t("fromMessage.hint")}
              rows={4}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className={styles.row}>
              <Button variant="outline" icon="sparkles" pending={pending === "extract"} disabled={message.trim().length < 3} onClick={() => void fillFromMessage()}>
                {t("fromMessage.fill")}
              </Button>
            </div>
          </Panel>
        ) : null}
        {check ? (
          <Alert tone="note" title={t("fromMessage.filled")}>
            {check.length ? t("fromMessage.check", { fields: check.map((c) => t(CHECK_LABEL[c])).join(", ") }) : t("fromMessage.checkAll")}
          </Alert>
        ) : null}
        <Panel title={t("what")}>
          <Select
            label={t("seva")}
            value={f.sevaType}
            onChange={(e) => set("sevaType", e.target.value as SevaType)}
            options={SevaTypeEnum.options.map((v) => ({ value: v, label: tSeva(v) }))}
          />
          <Input
            label={t("title")}
            hint={f.titleTouched ? undefined : t("titleHint")}
            value={titleEn}
            error={errors["title.en"]}
            maxLength={200}
            onChange={(e) => setF((s) => ({ ...s, titleTouched: true, titleEn: e.target.value }))}
          />
          <Input label={t("titleHi")} optional lang="hi" value={f.titleHi} maxLength={200} onChange={(e) => set("titleHi", e.target.value)} />
          <div className={`${styles.fieldGrid} ${styles.fieldGrid2}`}>
            <Input type="date" label={t("date")} value={f.date} error={errors.startsAt} onChange={(e) => set("date", e.target.value)} />
            <div className={`${styles.fieldGrid} ${styles.fieldGrid2}`} style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Input type="time" label={t("starts")} value={f.start} onChange={(e) => set("start", e.target.value)} />
              <Input type="time" label={t("ends")} optional value={f.end} error={errors.endsAt} onChange={(e) => set("end", e.target.value)} />
            </div>
          </div>
        </Panel>

        <Panel title={t("where")}>
          {samithis.length > 1 ? (
            <Select label={t("samithi")} hint={t("samithiHint")} value={f.samithiId} error={errors.samithiId} onChange={(e) => set("samithiId", e.target.value)} options={samithis.map((s) => ({ value: s.value, label: s.districtLabel ? `${s.label} · ${s.districtLabel}` : s.label }))} />
          ) : (
            <Input label={t("samithi")} value={samithiLabel} readOnly error={errors.samithiId} />
          )}
          <Input label={t("venue")} value={f.venueName} error={errors.venueName} maxLength={200} onChange={(e) => set("venueName", e.target.value)} />
          <Input label={t("address")} optional value={f.venueAddress} maxLength={400} onChange={(e) => set("venueAddress", e.target.value)} />
          <div className={`${styles.fieldGrid} ${styles.fieldGrid2}`}>
            <Input type="number" inputMode="numeric" min={0} max={10000} label={t("volunteers")} optional value={f.volunteers} error={errors.volunteersNeeded} onChange={(e) => set("volunteers", e.target.value)} />
          </div>
          <Textarea label={t("bring")} optional hint={t("bringHint")} rows={3} value={f.bring} onChange={(e) => set("bring", e.target.value)} />
        </Panel>

        <Panel title={t("description")} action={<span className={styles.cap}>{t("descriptionNote")}</span>}>
          <Textarea label={t("descEn")} value={f.descEn} rows={4} maxLength={4000} error={errors["description.en"]} onChange={(e) => set("descEn", e.target.value)} />
          <Textarea label={t("descHi")} lang="hi" value={f.descHi} rows={4} maxLength={4000} error={errors["description.hi"]} onChange={(e) => set("descHi", e.target.value)} />
        </Panel>

        <div className={`${styles.card}`} style={{ padding: 16 }}>
          <div className={styles.row} style={{ justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => router.push(event ? `/admin/events/${event.id}` : "/admin/events")}>
              {t("discard")}
            </Button>
            {isDraftish ? (
              <Button variant="outline" pending={pending === "draft"} onClick={() => save(false)}>
                {t("saveDraft")}
              </Button>
            ) : null}
            {isDraftish ? (
              <Button pending={pending === "submit"} icon="send" onClick={() => save(true)}>
                {t("submit")}
              </Button>
            ) : (
              <Button pending={pending === "draft"} onClick={() => save(false)}>
                {t("saveChanges")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <aside className={ev.mainCol} aria-label={t("previewLabel")} style={{ position: "sticky", top: 88 }}>
        <span className={styles.eyebrow}>{t("preview")}</span>
        <div className={ev.pub} style={{ background: "var(--white)", borderColor: "var(--border-subtle)" }}>
          <div className={styles.row} style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            {previewStart ? (
              <DayChip at={previewStart} />
            ) : (
              <span className={styles.dchip}>
                <b>—</b>
                <span>&nbsp;</span>
              </span>
            )}
            <span className={styles.qaIc}>
              <Icon name={SEVA_ICON[f.sevaType]} size={20} />
            </span>
          </div>
          <h3 className={ev.pubTitle} lang={pv}>
            {previewTitle}
          </h3>
          <p className={styles.cap} lang={pv} style={{ margin: 0 }}>
            {previewDesc.length > 160 ? `${previewDesc.slice(0, 160)}…` : previewDesc}
          </p>
          <div className={styles.meta} style={{ flexDirection: "column", gap: 4 }}>
            {previewStart ? (
              <span>
                <Icon name="clock" size={16} />
                {formatDateLong(previewStart, pv)} · {formatTimeRange(previewStart, f.end ? iso(f.date, f.end) : null, pv)}
              </span>
            ) : null}
            <span>
              <Icon name="map-pin" size={16} />
              {[f.venueName, samithiLabel].filter(Boolean).join(" · ") || t("previewNoVenue")}
            </span>
          </div>
        </div>
        <div className={styles.row} style={{ gap: 6 }}>
          {(["en", "hi"] as const).map((l) => (
            <Button key={l} size="sm" variant={pv === l ? "secondary" : "ghost"} onClick={() => setPreviewLang(l)} lang={l}>
              {l === "en" ? "EN" : "हिंदी"}
            </Button>
          ))}
          <span className={styles.cap}>{t("previewLang")}</span>
        </div>
      </aside>
    </form>
  );
}
