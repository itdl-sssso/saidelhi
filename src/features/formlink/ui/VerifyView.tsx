"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiFailure } from "@/lib/api";
import type { LinkInfo } from "@/contract";
import { useRouter } from "@/i18n/navigation";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { FieldMessage } from "@/ui/FieldMessage";
import { OtpInput } from "@/ui/OtpInput";
import { PhoneField } from "@/ui/PhoneField";
import { isIndianMobile, maskPhoneDigits, toE164 } from "@/ui/PhoneField/phone";
import { SkeletonCard } from "@/ui/Skeleton";
import { EventSummary } from "./EventSummary";
import { GoneView, type GoneKind } from "./GoneView";
import { formPaths, useCountdown, useLink, useOnline } from "./runtime";
import styles from "./formlink.module.css";

type Phase =
  | { k: "loading" }
  | { k: "offline" }
  | { k: "error" }
  | { k: "gone"; kind: GoneKind; link: LinkInfo | null }
  | { k: "ready"; info: LinkInfo; at: number };

const BOT_MIN_AGE_MS = 1600;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VerifyView({ token }: { token: string }) {
  const t = useTranslations("formlink");
  const router = useRouter();
  const online = useOnline();
  const { api, store, linkKey, locale } = useLink(token);
  const expired = useSearchParams().get("expired") === "1";
  const paths = formPaths(token);

  const [phase, setPhase] = useState<Phase>({ k: "loading" });
  const [reload, setReload] = useState(0);

  const retry = () => {
    setPhase({ k: "loading" });
    setReload((n) => n + 1);
  };

  // 1. What is this link?
  useEffect(() => {
    if (!store || !linkKey) return;
    let live = true;
    void api.info().then(async (r) => {
      if (!live) return;
      if (r.ok) {
        const info = r.data;
        if (info.hasSession) return router.replace(paths.form);
        if (info.state !== "active") return setPhase({ k: "gone", kind: info.state, link: info });
        return setPhase({ k: "ready", info, at: Date.now() });
      }
      if (r.status === 0) {
        // No signal: a form we already hold on this phone opens without verifying again.
        if (await store.getPayload(linkKey, locale)) return router.replace(paths.form);
        return setPhase({ k: "offline" });
      }
      if (r.status === 404) return setPhase({ k: "gone", kind: "not_found", link: null });
      if (r.status === 410) {
        const kind = r.error.code === "LINK_REVOKED" ? "revoked" : r.error.code === "LINK_USED_UP" ? "used_up" : "expired";
        const link = (r.error.details as { link?: LinkInfo } | undefined)?.link ?? null;
        return setPhase({ k: "gone", kind, link });
      }
      setPhase({ k: "error" });
    });
    return () => {
      live = false;
    };
  }, [api, store, linkKey, locale, reload, router, paths.form]);

  // Retry by itself when the connection comes back.
  const waiting = phase.k === "offline";
  useEffect(() => {
    if (!waiting) return;
    const again = () => retry();
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [waiting]);

  if (phase.k === "loading") return <div className={styles.page} aria-busy="true" aria-label={t("loading")}><SkeletonCard /></div>;
  if (phase.k === "gone") return <GoneView kind={phase.kind} link={phase.link} />;
  if (phase.k === "offline" || phase.k === "error") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t("verifyTitle")}</h1>
        <Alert tone={phase.k === "offline" ? "attention" : "error"}>{phase.k === "offline" ? t("offlineVerify") : t("genericError")}</Alert>
        <Button variant="outline" icon="refresh-cw" onClick={retry}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  return (
    <VerifyForm
      info={phase.info}
      api={api}
      online={online}
      expired={expired}
      loadedAt={phase.at}
      onVerified={() => router.replace(paths.form)}
      onStale={retry}
      onGone={(kind, link) => setPhase({ k: "gone", kind, link })}
    />
  );
}

function VerifyForm({
  info,
  api,
  online,
  expired,
  loadedAt,
  onVerified,
  onStale,
  onGone,
}: {
  info: LinkInfo;
  api: ReturnType<typeof useLink>["api"];
  online: boolean;
  expired: boolean;
  loadedAt: number;
  onVerified: () => void;
  onStale: () => void;
  onGone: (kind: GoneKind, link: LinkInfo | null) => void;
}) {
  const t = useTranslations("formlink");
  const needsOtp = info.purpose === "report" || (info.purpose === "desk" && info.otpRequired);

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ type: "error" | "warning"; text: string } | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const [humanChecked, setHumanChecked] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const resendIn = useCountdown(resendAt);
  const blockedFor = useCountdown(blockedUntil);
  const alertRef = useRef<HTMLDivElement>(null);

  const purposeLabel =
    info.purpose === "report" ? t("purposeReport") : info.purpose === "public" ? t("purposePublic") : info.deskLabel ? t("purposeDesk", { label: info.deskLabel }) : t("purposeDeskPlain");

  const fail = useCallback(
    (f: ApiFailure, where: "otp" | "verify" | "public") => {
      setBusy(false);
      const e = f.error;
      if (f.status === 0) return setNote({ type: "error", text: t("offlineVerify") });
      if (e.code === "PHONE_NOT_LISTED") return setPhoneError(t("notListed"));
      if (f.status === 423) {
        setBlockedUntil(Date.now() + (e.retryAfter ?? 600) * 1000);
        setCode("");
        return setNote(null);
      }
      if (f.status === 429) {
        const wait = (e.retryAfter ?? 30) * 1000;
        if (where === "otp") setResendAt(Date.now() + wait);
        return setNote({ type: "warning", text: t("rateLimited", { time: clock(Math.ceil(wait / 1000)) }) });
      }
      if (e.code === "PROVIDER_UNAVAILABLE") return setNote({ type: "error", text: t("providerDown") });
      if (f.status === 410) {
        const kind = e.code === "LINK_REVOKED" ? "revoked" : e.code === "LINK_USED_UP" ? "used_up" : "expired";
        return onGone(kind, (e.details as { link?: LinkInfo } | undefined)?.link ?? null);
      }
      if (f.status === 422) {
        setCode("");
        return setNote({ type: "error", text: e.fields?.code ?? t("wrongCode") });
      }
      if (where === "public" && (f.status === 403 || f.status === 400)) {
        onStale();
        return setNote({ type: "warning", text: t("botExpired") });
      }
      setNote({ type: "error", text: t("genericError") });
    },
    [onGone, onStale, t],
  );

  const sendCode = async () => {
    setNote(null);
    setPhoneError(null);
    if (!isIndianMobile(phone)) return setPhoneError(t("phoneInvalid"));
    setBusy(true);
    const r = await api.sendOtp(toE164(phone));
    if (!r.ok) return fail(r, "otp");
    setBusy(false);
    setStep("code");
    setCode("");
    setResendAt(Date.now() + r.data.resendAfter * 1000);
  };

  const verify = async (value: string) => {
    if (busy || value.length !== 6 || blockedFor > 0) return;
    setNote(null);
    setBusy(true);
    const r = await api.verify(toE164(phone), value);
    if (!r.ok) return fail(r, "verify");
    onVerified();
  };

  const startPublic = async () => {
    if (!info.botChallenge) return onStale();
    setNote(null);
    setBusy(true);
    const wait = BOT_MIN_AGE_MS - (Date.now() - loadedAt);
    if (wait > 0) await new Promise((res) => setTimeout(res, wait));
    const r = await api.startPublic(info.botChallenge, honeypot);
    if (!r.ok) return fail(r, "public");
    onVerified();
  };

  useEffect(() => {
    if (note) alertRef.current?.focus();
  }, [note]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("verifyTitle")}</h1>
      {expired ? <Alert tone="attention">{t("sessionExpired")}</Alert> : null}
      {info.event ? <EventSummary event={info.event} purpose={purposeLabel} /> : <span className={styles.purpose}>{purposeLabel}</span>}
      {!online ? <Alert tone="attention">{t("offlineVerify")}</Alert> : null}

      <div ref={alertRef} tabIndex={-1} role={note ? "alert" : undefined} style={{ outline: "none" }}>
        {note ? <FieldMessage type={note.type}>{note.text}</FieldMessage> : null}
      </div>

      {needsOtp ? (
        step === "phone" ? (
          <form
            className={styles.stack}
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
            noValidate
          >
            {info.purpose === "desk" ? <p className={styles.lead}>{t("deskIntro")}</p> : null}
            <PhoneField
              id="phone"
              label={t("phoneLabel")}
              help={t("phoneHelp")}
              value={phone}
              onChange={(v) => {
                setPhone(v);
                setPhoneError(null);
              }}
              messages={phoneError ? [{ type: "error", text: phoneError }] : undefined}
              disabled={busy}
              autoFocus
            />
            <Button type="submit" size="lg" icon="message-circle" pending={busy} disabled={!online || blockedFor > 0} fullWidth>
              {busy ? t("sendingCode") : t("sendCode")}
            </Button>
            {blockedFor > 0 ? <FieldMessage type="warning">{t("rateLimited", { time: clock(blockedFor) })}</FieldMessage> : null}
          </form>
        ) : (
          <form
            className={styles.stack}
            onSubmit={(e) => {
              e.preventDefault();
              void verify(code);
            }}
            noValidate
          >
            <p className={styles.lead} id="code-sent">
              {t("codeSentTo", { phone: maskPhoneDigits(phone).replace(/^\+91 /, "") })}
            </p>
            <div className={styles.stack}>
              <span id="code-label" style={{ fontSize: "var(--text-small)", fontWeight: 500 }}>
                {t("codeLabel")}
              </span>
              <OtpInput id="code" value={code} onChange={setCode} onComplete={(c) => void verify(c)} error={note?.type === "error"} disabled={busy || blockedFor > 0} autoFocus describedBy="code-sent" />
            </div>
            {blockedFor > 0 ? (
              <Alert tone="error" title={t("lockedTitle")}>
                {t("locked", { time: clock(blockedFor) })}
              </Alert>
            ) : null}
            <Button type="submit" size="lg" pending={busy} disabled={code.length !== 6 || blockedFor > 0 || !online} fullWidth>
              {busy ? t("verifying") : t("verify")}
            </Button>
            <div className={styles.row} style={{ justifyContent: "space-between" }}>
              {resendIn > 0 ? (
                <span className={styles.timer} aria-live="off">
                  {t("resendIn", { s: resendIn })}
                </span>
              ) : (
                <Button type="button" variant="quiet" size="sm" icon="refresh-cw" onClick={() => void sendCode()} disabled={busy || !online}>
                  {t("resend")}
                </Button>
              )}
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setNote(null);
                }}
              >
                {t("changeNumber")}
              </Button>
            </div>
            <details className={styles.help}>
              <summary>{t("notArriving")}</summary>
              <p>{t("notArrivingHelp", { minutes: 10 })}</p>
            </details>
          </form>
        )
      ) : (
        <form
          className={styles.stack}
          onSubmit={(e) => {
            e.preventDefault();
            void startPublic();
          }}
        >
          <p className={styles.lead}>{info.purpose === "public" ? t("publicIntro") : t("deskBotIntro")}</p>
          {/* Honeypot: people never see or fill this; bots do. */}
          <div className={styles.honeypot} aria-hidden="true">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>
          <Checkbox label={t("botLabel")} checked={humanChecked} onChange={(e) => setHumanChecked(e.target.checked)} />
          <Button type="submit" size="lg" pending={busy} disabled={!humanChecked || !online} fullWidth>
            {t("botContinue")}
          </Button>
        </form>
      )}
    </div>
  );
}
