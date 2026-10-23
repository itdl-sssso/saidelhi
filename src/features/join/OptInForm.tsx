"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { type OptInBody, type OptInChallenge, type SevaType, endpoints } from "@/contract";
import { apiRequest } from "@/lib/api";
import type { AppLocale } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { PhoneField } from "@/ui/PhoneField";
import { Select } from "@/ui/Select";
import styles from "./Join.module.css";

export type OptInOption = { value: string; label: string };

const MIN_TOKEN_AGE_MS = 1600; // the server rejects a token younger than 1.5 s
const MAX_TOKEN_AGE_MS = 20 * 60 * 1000; // and one older than 30 min

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "error"; message: string; phone?: string };

/**
 * Optional "send me seva updates on WhatsApp" form (spec 11 + decision of 23 Oct).
 * POST /whatsapp/optin always answers 202 with a neutral message, whether or not the number is new.
 */
export function OptInForm({ districts, sevaTypes }: { districts: OptInOption[]; sevaTypes: Array<{ value: SevaType; label: string }> }) {
  const t = useTranslations("join");
  const locale = useLocale() as AppLocale;
  const id = useId();
  const [digits, setDigits] = useState("");
  const [district, setDistrict] = useState("");
  const [types, setTypes] = useState<SevaType[]>([]);
  const [state, setState] = useState<State>({ kind: "idle" });
  const token = useRef<{ value: string; at: number } | null>(null);

  const fetchToken = async () => {
    const res = await apiRequest<OptInChallenge>(endpoints.whatsappOptIn());
    if (res.ok) token.current = { value: res.data.botToken, at: Date.now() };
    return res.ok;
  };

  // Fetch the bot-check token as soon as the form is on screen so a real person is never made to wait.
  useEffect(() => {
    void fetchToken();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.kind === "sending") return;
    if (digits.length !== 10) {
      setState({ kind: "error", message: t("phoneInvalid"), phone: t("phoneInvalid") });
      return;
    }
    setState({ kind: "sending" });
    if (!token.current || Date.now() - token.current.at > MAX_TOKEN_AGE_MS) {
      if (!(await fetchToken())) return setState({ kind: "error", message: t("optinError") });
    }
    const wait = MIN_TOKEN_AGE_MS - (Date.now() - (token.current?.at ?? 0));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const body: OptInBody = {
      phone: `+91${digits}`,
      districtId: district || null,
      sevaTypes: types,
      locale,
      botToken: token.current?.value ?? "",
    };
    const res = await apiRequest<unknown>(endpoints.whatsappOptIn(), { method: "POST", body, locale });
    token.current = null;
    void fetchToken();
    if (res.ok) return setState({ kind: "done" });
    if (res.error.code === "RATE_LIMITED") return setState({ kind: "error", message: t("optinTooMany") });
    if (res.error.fields?.phone) return setState({ kind: "error", message: t("phoneInvalid"), phone: t("phoneInvalid") });
    setState({ kind: "error", message: t("optinError") });
  };

  if (state.kind === "done") {
    return (
      <Alert tone="success" title={t("optinDoneTitle")} role="status">
        {t("optinDoneBody")}
      </Alert>
    );
  }

  const toggle = (v: SevaType, on: boolean) => setTypes((cur) => (on ? [...cur, v] : cur.filter((x) => x !== v)));

  return (
    <form onSubmit={submit} className={styles.optin} noValidate aria-busy={state.kind === "sending" || undefined}>
      <PhoneField
        id={`${id}-phone`}
        label={t("phoneLabel")}
        value={digits}
        onChange={setDigits}
        messages={state.kind === "error" && state.phone ? [{ type: "error", text: state.phone }] : undefined}
        onEnter={() => undefined}
      />
      <Select
        label={t("optinDistrict")}
        optional
        value={district}
        onChange={(e) => setDistrict(e.target.value)}
        options={[{ value: "", label: t("anyDistrict") }, ...districts]}
      />
      <fieldset className={styles.types}>
        <legend>{t("optinTypes")}</legend>
        <div className={styles.typeList}>
          {sevaTypes.map((s) => (
            <Checkbox key={s.value} label={s.label} checked={types.includes(s.value)} onChange={(e) => toggle(s.value, e.target.checked)} />
          ))}
        </div>
      </fieldset>
      <p className={styles.cap}>{t("optinConsent")}</p>
      {state.kind === "error" && !state.phone ? (
        <Alert tone="attention" role="alert">
          {state.message}
        </Alert>
      ) : null}
      <Button type="submit" pending={state.kind === "sending"} icon="send">
        {t("optinSubmit")}
      </Button>
    </form>
  );
}
