"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { type Me, type OtpChannel, type OtpSent, authEndpoints } from "@/contract";
import { useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/format";
import { portalRequest } from "@/lib/portal-api";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Icon } from "@/ui/Icon";
import { OtpInput } from "@/ui/OtpInput";
import { Timer } from "../icons";
import styles from "./Login.module.css";

type Step = "phone" | "code";

const RESEND_SECONDS = 30;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Ticks down once per second from `seconds`; 0 when idle. */
function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, setLeft] as const;
}

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("admin.login");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<OtpChannel>("whatsapp");
  const [busy, setBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "info" | "error" | "attention"; text: string; offerEmail?: boolean } | null>(null);
  const [resendLeft, setResendLeft] = useCountdown();
  const [lockLeft, setLockLeft] = useCountdown();

  const phone = `+91${digits}`;
  const phoneValid = /^[6-9]\d{9}$/.test(digits);
  const masked = `+91 ${digits.slice(0, 2)}•••••${digits.slice(-2)}`;

  const sendCode = useCallback(
    async (via: OtpChannel) => {
      setBusy(true);
      setBanner(null);
      setPhoneError(null);
      const res = await portalRequest<OtpSent>(authEndpoints.otp(), { method: "POST", body: { phone, channel: via }, locale });
      setBusy(false);
      if (res.ok) {
        setChannel(via);
        setStep("code");
        setCode("");
        setCodeError(null);
        setResendLeft(res.data?.resendAfter || RESEND_SECONDS);
        return;
      }
      const e = res.error;
      if (res.status === 423 || res.status === 429) {
        setLockLeft(e.retryAfter ?? 60);
        setBanner({ tone: "attention", text: t("tooMany") });
      } else if (res.status === 422) {
        setPhoneError(e.fields?.phone ?? t("phoneInvalid"));
      } else if (res.status === 503) {
        setBanner({ tone: "error", text: t("providerDown"), offerEmail: via === "whatsapp" });
      } else if (res.status === 0) {
        setBanner({ tone: "error", text: t("network") });
      } else {
        setBanner({ tone: "error", text: t("generic") });
      }
    },
    [locale, phone, setLockLeft, setResendLeft, t],
  );

  const verify = useCallback(
    async (value: string) => {
      if (value.length !== 6 || busy) return;
      setBusy(true);
      setCodeError(null);
      setBanner(null);
      const res = await portalRequest<Me>(authEndpoints.verify(), { method: "POST", body: { phone, code: value }, locale });
      if (res.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      setBusy(false);
      const e = res.error;
      if (res.status === 423 || res.status === 429) {
        setLockLeft(e.retryAfter ?? 60);
        setBanner({ tone: "attention", text: t("tooMany") });
      } else if (res.status === 422) {
        setCodeError(e.fields?.code ?? e.message ?? t("codeWrong"));
        setCode("");
      } else if (res.status === 410) {
        setCodeError(t("codeExpired"));
        setCode("");
      } else if (res.status === 0) {
        setBanner({ tone: "error", text: t("network") });
      } else {
        setBanner({ tone: "error", text: t("generic") });
      }
    },
    [busy, locale, next, phone, router, setLockLeft, t],
  );

  const locked = lockLeft > 0;

  return (
    <section className={styles.card} aria-labelledby="login-h">
      <span className={styles.eyebrow}>{t("eyebrow")}</span>
      {step === "phone" ? (
        <form
          style={{ display: "contents" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!phoneValid) return setPhoneError(t("phoneInvalid"));
            void sendCode("whatsapp");
          }}
          noValidate
        >
          <h1 id="login-h" className={styles.h1}>
            {t("title")}
          </h1>
          <p className={styles.lead}>{t("lead")}</p>
          <div className={styles.phone}>
            <span className={styles.prefix} aria-hidden="true">
              +91
            </span>
            <div className={styles.phoneInput}>
              <Input
                label={t("phoneLabel")}
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={12}
                value={digits}
                error={phoneError ?? undefined}
                placeholder="98765 43210"
                onChange={(e) => {
                  setDigits(e.target.value.replace(/\D/g, "").slice(-10));
                  setPhoneError(null);
                }}
              />
            </div>
          </div>
          {banner ? (
            <Alert tone={banner.tone}>
              {banner.text}
              {locked ? ` ${t("tryAgainIn", { time: mmss(lockLeft) })}` : null}
            </Alert>
          ) : null}
          <Button type="submit" pending={busy} disabled={locked} fullWidth>
            {t("send")}
          </Button>
          <p className={styles.note}>{t("help")}</p>
        </form>
      ) : (
        <>
          <h1 id="login-h" className={styles.h1}>
            {t("codeTitle")}
          </h1>
          <Alert tone="info">{channel === "email" ? t("neutralEmail") : t("neutral", { phone: masked })}</Alert>
          <OtpInput id="code" value={code} onChange={setCode} onComplete={(c) => void verify(c)} error={!!codeError} disabled={busy || locked} autoFocus describedBy={codeError ? "code-error" : undefined} />
          {codeError ? (
            <span id="code-error" className={styles.err} role="alert">
              {codeError}
            </span>
          ) : null}
          {banner ? (
            <Alert tone={banner.tone}>
              {banner.text}
              {locked ? ` ${t("tryAgainIn", { time: mmss(lockLeft) })}` : null}
            </Alert>
          ) : null}
          <Button type="button" pending={busy} disabled={code.length !== 6 || locked} onClick={() => verify(code)} fullWidth>
            {t("verify")}
          </Button>
          <div className={styles.foot}>
            {resendLeft > 0 ? (
              <span className={styles.resend} aria-live="polite">
                <Icon icon={Timer} size={16} />
                {t("resendIn", { time: mmss(resendLeft) })}
              </span>
            ) : (
              <button type="button" className={styles.help} disabled={busy || locked} onClick={() => sendCode(channel)}>
                {t("resend")}
              </button>
            )}
            <button
              type="button"
              className={styles.help}
              onClick={() => {
                setStep("phone");
                setCode("");
                setBanner(null);
                setCodeError(null);
              }}
            >
              {t("changeNumber")}
            </button>
          </div>
          {channel === "whatsapp" ? (
            <button type="button" className={styles.help} disabled={busy || locked} onClick={() => sendCode("email")}>
              {t("emailFallback")}
            </button>
          ) : null}
        </>
      )}
      {step === "phone" && banner?.offerEmail ? (
        <button type="button" className={styles.help} disabled={busy || !phoneValid} onClick={() => sendCode("email")}>
          {t("emailFallback")}
        </button>
      ) : null}
    </section>
  );
}
