"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { endpoints, type PrivacyRequestInput, PrivacyRequestType } from "@/contract";
import { apiRequest } from "@/lib/api";
import { type AppLocale, addDaysKey, formatIsoDate, istDateKey } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Input, Textarea } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { useToast } from "@/ui/Toast";
import styles from "./Privacy.module.css";

type FieldName = "name" | "phone" | "type" | "details";
const FIELD_ORDER: FieldName[] = ["name", "phone", "type", "details"];

type Sent = { id: string; type: string; replyBy: string };

/** Spec 17 request form. Posts to POST /api/v1/privacy/requests (CONTRACT §5.1). */
export function PrivacyRequestForm() {
  const t = useTranslations("privacy");
  const locale = useLocale() as AppLocale;
  const toast = useToast();
  const summaryId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [sent, setSent] = useState<Sent | null>(null);

  const waitSeconds = retryUntil ? Math.max(0, Math.ceil((retryUntil - now) / 1000)) : 0;

  // 429: count down from retryAfter, then re-enable the button.
  useEffect(() => {
    if (!retryUntil) return;
    const timer = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= retryUntil) {
        setRetryUntil(null);
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  useEffect(() => {
    if (sent) successRef.current?.focus();
  }, [sent]);

  const typeLabel = (v: string) => t(`type_${v as PrivacyRequestType}`);

  const focusFirst = (errs: Partial<Record<FieldName, string>>) => {
    const firstField = FIELD_ORDER.find((f) => errs[f]);
    if (!firstField) return;
    window.requestAnimationFrame(() => {
      const el = formRef.current?.elements.namedItem(firstField);
      if (el instanceof HTMLElement) el.focus();
    });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || waitSeconds > 0) return;
    const form = new FormData(e.currentTarget);
    const body: PrivacyRequestInput = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      type: String(form.get("type") ?? "") as PrivacyRequestType,
      details: String(form.get("details") ?? ""),
      website: String(form.get("website") ?? ""),
      locale,
    };

    // Quick client checks for empty required fields; the server stays the authority.
    const local: Partial<Record<FieldName, string>> = {};
    if (!body.name.trim()) local.name = t("errName");
    if (!body.phone.trim()) local.phone = t("errPhone");
    if (!PrivacyRequestType.safeParse(body.type).success) local.type = t("errType");
    if (Object.keys(local).length) {
      setErrors(local);
      focusFirst(local);
      return;
    }

    setPending(true);
    setErrors({});
    const res = await apiRequest<{ id: string }>(endpoints.privacyRequests(), { method: "POST", body, locale });
    setPending(false);

    if (res.ok) {
      setSent({ id: res.data.id, type: body.type, replyBy: formatIsoDate(addDaysKey(istDateKey(new Date()), 30), locale) });
      return;
    }
    const { error } = res;
    if (res.status === 422 && error.fields) {
      const mapped: Partial<Record<FieldName, string>> = {};
      for (const [k, v] of Object.entries(error.fields)) {
        if ((FIELD_ORDER as string[]).includes(k)) mapped[k as FieldName] = v;
      }
      if (Object.keys(mapped).length === 0) mapped.details = error.message;
      setErrors(mapped);
      focusFirst(mapped);
      return;
    }
    if (res.status === 429) {
      const secs = error.retryAfter ?? 60;
      setNow(Date.now());
      setRetryUntil(Date.now() + secs * 1000);
      return;
    }
    toast.show({ tone: "error", message: res.status === 0 ? t("errNetwork") : t("errServer") });
  };

  if (sent) {
    return (
      <div className={styles.formCard} role="status">
        <span className={styles.okIcon}>
          <Icon name="circle-check" size={24} />
        </span>
        <h3 ref={successRef} tabIndex={-1} className={styles.formTitle}>
          {t("sentTitle")}
        </h3>
        <p className={styles.small}>{t("sentBody", { date: sent.replyBy })}</p>
        <dl className={styles.dl}>
          <dt>{t("sentRequest")}</dt>
          <dd>{typeLabel(sent.type)}</dd>
          <dt>{t("sentReference")}</dt>
          <dd className={styles.mono}>{sent.id}</dd>
        </dl>
        <Button variant="outline" icon="arrow-left" onClick={() => setSent(null)}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form ref={formRef} className={styles.formCard} onSubmit={onSubmit} noValidate aria-describedby={errorCount ? summaryId : undefined}>
      <h3 className={styles.formTitle} id="request-form">
        {t("formTitle")}
      </h3>
      {errorCount ? (
        <Alert tone="error" id={summaryId} title={t("errSummary", { count: errorCount })}>
          <ul className={styles.errList}>
            {FIELD_ORDER.filter((f) => errors[f]).map((f) => (
              <li key={f}>
                <a href={`#privacy-${f}`}>{errors[f]}</a>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      <Input id="privacy-name" name="name" label={t("fieldName")} autoComplete="name" required maxLength={120} error={errors.name} />
      <Input
        id="privacy-phone"
        name="phone"
        label={t("fieldPhone")}
        hint={t("fieldPhoneHint")}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+91"
        required
        maxLength={20}
        error={errors.phone}
      />
      <Select
        id="privacy-type"
        name="type"
        label={t("fieldType")}
        placeholder={t("fieldTypePlaceholder")}
        defaultValue=""
        required
        options={PrivacyRequestType.options.map((v) => ({ value: v, label: typeLabel(v) }))}
        error={errors.type}
      />
      <Textarea
        id="privacy-details"
        name="details"
        label={t("fieldDetails")}
        optional
        placeholder={t("fieldDetailsPlaceholder")}
        maxLength={2000}
        error={errors.details}
      />
      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div className={styles.hp} aria-hidden="true">
        <label htmlFor="privacy-website">Website</label>
        <input id="privacy-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" icon="send" pending={pending} disabled={waitSeconds > 0}>
        {t("submit")}
      </Button>
      {waitSeconds > 0 ? (
        <p className={styles.wait} role="status">
          {t("rateLimited", { seconds: waitSeconds })}
        </p>
      ) : null}
      <p className={styles.reply}>
        <Icon name="clock" size={16} />
        {t("replyWithin")}
      </p>
    </form>
  );
}
