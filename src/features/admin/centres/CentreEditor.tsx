"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { type CentreAdmin, type Gathering, type GatheringKind, GatheringKind as KindEnum, type Geo, type Media, adminEndpoints, UPLOAD_LIMITS } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatTime, tx, weekdayName } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { PageHead, Panel, Pill } from "../kit";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { useUpload } from "../useUpload";
import { I18nFields, type I18nValue, toI18n } from "../fields";
import { Loadable, Note, TogRow } from "../parts";
import { PinPicker } from "./PinPicker";
import styles from "../Admin.module.css";
import c from "./Centres.module.css";

interface State {
  name: I18nValue;
  address: I18nValue;
  pincode: string;
  geo: Geo | null;
  phone: string;
  schedule: Gathering[];
  photos: Media[];
  active: boolean;
}

const from = (d: CentreAdmin): State => ({ name: toI18n(d.name), address: toI18n(d.address), pincode: d.pincode ?? "", geo: d.geo, phone: d.contactPhone ?? "", schedule: d.schedule, photos: d.photos, active: d.active });

export function CentreEditor({ id, canList }: { id: string; canList: boolean }) {
  const api = useApi<CentreAdmin>(adminEndpoints.centre(id));
  return (
    <Loadable api={api} rows={8}>
      {(d) => <Form key={`${d.id}-${d.version}`} d={d} canList={canList} reload={api.reload} />}
    </Loadable>
  );
}

function Form({ d, canList, reload }: { d: CentreAdmin; canList: boolean; reload: () => void }) {
  const t = useTranslations("admin.centres");
  const tg = useTranslations("gathering");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const { upload, pending: uploading } = useUpload();
  const [s, setS] = useState<State>(from(d));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alt, setAlt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(from(d));
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = async () => {
    const e: Record<string, string> = {};
    if (!s.name.en.trim()) e["name.en"] = t("errName");
    if (!s.address.en.trim()) e["address.en"] = t("errAddress");
    if (s.pincode && !/^\d{6}$/.test(s.pincode)) e.pincode = t("errPincode");
    if (s.geo && (Math.abs(s.geo.lat) > 90 || Math.abs(s.geo.lng) > 180)) e.geo = t("errGeo");
    setErrors(e);
    if (Object.keys(e).length) return;
    const body = {
      name: { en: s.name.en.trim(), hi: s.name.hi?.trim() || null },
      address: { en: s.address.en.trim(), hi: s.address.hi?.trim() || null },
      pincode: s.pincode || null,
      geo: s.geo,
      contactPhone: s.phone.trim() || null,
      schedule: s.schedule,
      photos: s.photos,
      active: s.active,
      version: d.version,
    };
    const res = await run(adminEndpoints.centre(d.id), { method: "PATCH", body }, { key: "save", success: t("saved"), quiet422: true, onReload: reload });
    if (res.ok) reload();
    else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };

  const addPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!(UPLOAD_LIMITS.photoMimes as readonly string[]).includes(file.type) || file.size > UPLOAD_LIMITS.photoBytes) return setErrors({ photo: t("errPhotoFile") });
    if (!alt.trim()) return setErrors({ photo: t("errAlt") });
    setErrors({});
    const fd = new FormData();
    fd.append("file", file);
    fd.append("alt", alt.trim());
    const res = await upload<Media>(adminEndpoints.centrePhotos(d.id), fd, "photo");
    if (res.ok) {
      set("photos", [...s.photos, res.data]);
      setAlt("");
      if (fileRef.current) fileRef.current.value = "";
    } else if (res.status === 422) setErrors({ photo: res.error.fields ? Object.values(res.error.fields)[0] : res.error.message });
  };

  const sched = (i: number, patch: Partial<Gathering>) => set("schedule", s.schedule.map((g, j) => (j === i ? { ...g, ...patch } : g)));

  return (
    <div className={styles.page}>
      <PageHead title={tx(d.name, locale)} sub={`${tx(d.samithi.name, locale)} · ${tx(d.district.name, locale)}`} back={canList ? { href: "/admin/centres", label: t("back") } : undefined} actions={<Link href={d.publicPath} className={styles.linkBtn}>{t("viewPublic")}</Link>} />
      <div className={c.layout}>
        <div className={styles.stack}>
          {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
          <Panel title={t("secProfile")}>
            <div className={styles.dialogBody}>
              <I18nFields label={t("name")} value={s.name} onChange={(v) => set("name", v)} error={errors["name.en"]} maxLength={160} />
              <I18nFields label={t("address")} value={s.address} onChange={(v) => set("address", v)} error={errors["address.en"]} multiline rows={2} maxLength={400} />
              <Input label={t("pincode")} inputMode="numeric" maxLength={6} optional value={s.pincode} error={errors.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} />
              <Input label={t("phone")} type="tel" optional hint={t("phoneWarn")} value={s.phone} error={errors.contactPhone} onChange={(e) => set("phone", e.target.value)} />
              <TogRow label={t("active")} desc={t("activeDesc")} checked={s.active} onChange={(v) => set("active", v)} />
            </div>
          </Panel>
          <Panel title={t("secMap")}>
            <PinPicker value={s.geo} onChange={(g) => set("geo", g)} error={errors.geo} />
          </Panel>
          <Panel
            title={t("secSchedule")}
            action={
              s.schedule.length < 20 ? (
                <Button size="sm" variant="outline" icon="plus" onClick={() => set("schedule", [...s.schedule, { day: 0, time: "17:00", kind: "bhajan", language: "mixed" }])}>
                  {t("addRow")}
                </Button>
              ) : undefined
            }
          >
            {s.schedule.length === 0 ? (
              <Note icon="info">{t("noSchedule")}</Note>
            ) : (
              <div className={styles.dialogBody}>
                {s.schedule.map((g, i) => (
                  <div key={i} className={c.sched}>
                    <Select label={t("day")} value={String(g.day)} onChange={(e) => sched(i, { day: Number(e.target.value) })} options={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: weekdayName(n, locale) }))} />
                    <Input label={t("time")} type="time" value={g.time} onChange={(e) => sched(i, { time: e.target.value })} />
                    <Select label={t("kind")} value={g.kind} onChange={(e) => sched(i, { kind: e.target.value as GatheringKind })} options={KindEnum.options.map((k) => ({ value: k, label: tg(k) }))} />
                    <Select label={t("language")} value={g.language} onChange={(e) => sched(i, { language: e.target.value as Gathering["language"] })} options={[{ value: "en", label: t("langEn") }, { value: "hi", label: t("langHi") }, { value: "mixed", label: t("langMixed") }]} />
                    <Button size="sm" variant="ghost" icon="x" aria-label={t("removeRow")} onClick={() => set("schedule", s.schedule.filter((_, j) => j !== i))}>
                      <span className={styles.srOnly}>{t("removeRow")}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title={t("secPhotos")} badge={`${s.photos.length}/12`}>
            <div className={styles.dialogBody}>
              <Alert tone="info">{t("photoRule")}</Alert>
              {s.photos.length > 0 ? (
                <ul className={c.photos}>
                  {s.photos.map((m, i) => (
                    <li key={m.url} className={c.photo}>
                      <Image src={m.url} alt={tx(m.alt, locale)} width={m.width ?? 400} height={m.height ?? 300} unoptimized />
                      <Input label={t("altEn")} value={m.alt.en} onChange={(e) => set("photos", s.photos.map((x, j) => (j === i ? { ...x, alt: { ...x.alt, en: e.target.value } } : x)))} />
                      <Input label={t("altHi")} lang="hi" optional value={m.alt.hi ?? ""} onChange={(e) => set("photos", s.photos.map((x, j) => (j === i ? { ...x, alt: { ...x.alt, hi: e.target.value || null } } : x)))} />
                      <Button size="sm" variant="ghost" onClick={() => set("photos", s.photos.filter((_, j) => j !== i))}>
                        {t("removePhoto")}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {s.photos.length < 12 ? (
                <div className={styles.dialogBody}>
                  <Input label={t("newAlt")} hint={t("newAltHint")} value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} error={errors.photo} />
                  <input ref={fileRef} id="centre-photo" aria-label={t("addPhoto")} tabIndex={-1} type="file" accept={UPLOAD_LIMITS.photoMimes.join(",")} className={styles.srOnly} onChange={(e) => addPhoto(e.target.files?.[0])} />
                  <Button variant="outline" icon="upload" pending={uploading === "photo"} onClick={() => fileRef.current?.click()}>
                    {t("addPhoto")}
                  </Button>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
        <aside className={c.aside} aria-label={t("preview")}>
          <div className={c.prev}>
            <Pill tone="blue">{t("preview")}</Pill>
            {s.photos[0] ? <Image className={c.prevImg} src={s.photos[0].url} alt="" width={640} height={360} unoptimized /> : null}
            <h2 className={c.prevT}>{(locale === "hi" ? s.name.hi : null) || s.name.en || t("name")}</h2>
            <p className={c.prevRow}>
              <Icon name="map-pin" size={16} /> {(locale === "hi" ? s.address.hi : null) || s.address.en || "—"}
              {s.pincode ? ` · ${s.pincode}` : ""}
            </p>
            {s.phone ? (
              <p className={c.prevRow}>
                <Icon name="phone" size={16} /> {s.phone}
              </p>
            ) : null}
            {s.schedule.map((g, i) => (
              <p key={i} className={c.prevRow}>
                {weekdayName(g.day, locale)} {formatTime(`2026-01-01T${g.time}:00+05:30`, locale)} · {tg(g.kind)}
              </p>
            ))}
          </div>
          <Button pending={pending === "save"} disabled={!dirty} onClick={save}>
            {t("save")}
          </Button>
          {dirty ? <span className={styles.cap}>{t("unsaved")}</span> : <span className={styles.cap}>{t("loggedNote")}</span>}
        </aside>
      </div>
    </div>
  );
}
