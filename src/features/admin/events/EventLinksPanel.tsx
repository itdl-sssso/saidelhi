"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type FormLink, adminEndpoints } from "@/contract";
import { type AppLocale } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Input } from "@/ui/Input";
import { LinkStatePill, Panel, usesText } from "../kit";
import { LinkActions } from "../links/LinkActions";
import { fmtShortDateTime } from "../time";
import { useAction } from "../useAction";
import styles from "../Admin.module.css";
import ev from "./Event.module.css";

export function EventLinksPanel({ eventId, links, open, canManage }: { eventId: string; links: FormLink[]; open: boolean; canManage: boolean }) {
  const t = useTranslations("admin.links");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"phone" | "qr">("phone");
  const [digits, setDigits] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nextDesk = links.filter((l) => l.purpose === "desk").length + 1;

  const submit = async () => {
    const res = await run(
      adminEndpoints.eventLinks(eventId),
      { body: { purpose: "desk", label: label.trim() || `${t("desk")} ${nextDesk}`, sendTo: mode === "qr" ? "qr" : `+91${digits}`, lang: locale } },
      { key: "add", success: t("added"), quiet422: true },
    );
    if (res.ok) {
      setAdding(false);
      setLabel("");
      setDigits("");
      setErrors({});
    } else if (res.status === 422) {
      setErrors(res.error.fields ?? { sendTo: res.error.message });
    }
  };

  return (
    <Panel
      title={t("panelTitle")}
      flush
      action={
        canManage && open ? (
          <Button variant="outline" size="sm" icon="plus" onClick={() => setAdding(true)}>
            {t("addDesk")}
          </Button>
        ) : undefined
      }
    >
      {!open ? (
        <div className={styles.cardBd}>
          <Alert tone="info">{t("lockedExplain")}</Alert>
        </div>
      ) : links.length === 0 ? (
        <div className={styles.cardBd}>
          <EmptyState icon="send" title={t("noneTitle")} body={t("noneBody")} />
        </div>
      ) : (
        links.map((l) => (
          <div className={ev.linkRow} key={l.id}>
            <div className={ev.linkMain}>
              <div className={ev.linkTop}>
                <b className={styles.strong}>{l.label}</b>
                <LinkStatePill state={l.state} />
              </div>
              <span className={styles.cap}>{l.sentTo === "qr" ? t("qrPoster") : (l.sentTo ?? t("notSent"))}</span>
              <div className={ev.linkMeta}>
                <span>{t("expires", { date: fmtShortDateTime(l.expiresAt, locale) })}</span>
                <span>{t("uses", { uses: usesText(l.uses, l.maxUses) })}</span>
                <span>{l.lastOpenedAt ? t("lastOpened", { date: fmtShortDateTime(l.lastOpenedAt, locale) }) : t("neverOpened")}</span>
                <span>{l.otpRequired ? t("otpYes") : t("otpNo")}</span>
              </div>
            </div>
            <LinkActions link={l} canManage={canManage} />
          </div>
        ))
      )}

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title={t("addDesk")}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              {t("close")}
            </Button>
            <Button
              pending={pending === "add"}
              onClick={() => {
                if (mode === "phone" && !/^[6-9]\d{9}$/.test(digits)) return setErrors({ sendTo: t("phoneInvalid") });
                void submit();
              }}
            >
              {t("create")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <p className={styles.sub}>{t("addBody")}</p>
          <Input label={t("labelField")} optional placeholder={`${t("desk")} ${nextDesk}`} value={label} error={errors.label} onChange={(e) => setLabel(e.target.value)} />
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            <legend className={styles.strong} style={{ marginBottom: 6 }}>
              {t("deliver")}
            </legend>
            <label className={styles.row}>
              <input type="radio" name="mode" checked={mode === "phone"} onChange={() => setMode("phone")} />
              {t("deliverPhone")}
            </label>
            <label className={styles.row}>
              <input type="radio" name="mode" checked={mode === "qr"} onChange={() => setMode("qr")} />
              {t("deliverQr")}
            </label>
          </fieldset>
          {mode === "phone" ? (
            <Input
              label={t("phoneField")}
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={digits}
              error={errors.sendTo}
              hint={t("phoneHint")}
              placeholder="98765 43210"
              onChange={(e) => {
                setDigits(e.target.value.replace(/\D/g, "").slice(-10));
                setErrors({});
              }}
            />
          ) : null}
        </div>
      </Dialog>
    </Panel>
  );
}
