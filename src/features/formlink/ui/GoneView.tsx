"use client";

import { useLocale, useTranslations } from "next-intl";
import type { LinkInfo } from "@/contract";
import { formatDateLong, type AppLocale } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { EventSummary } from "./EventSummary";
import styles from "./formlink.module.css";

export type GoneKind = "expired" | "revoked" | "used_up" | "not_found";

/** Spec 22: expired, revoked, used-up and unknown links. The event card appears only when the server sent it. */
export function GoneView({ kind, link }: { kind: GoneKind; link: LinkInfo | null }) {
  const t = useTranslations("formlink");
  const locale = useLocale() as AppLocale;
  const date = link?.expiresAt ? formatDateLong(link.expiresAt, locale) : "";
  const copy = {
    expired: { title: t("expiredTitle"), body: t("expiredBody", { date }) },
    revoked: { title: t("revokedTitle"), body: t("revokedBody") },
    used_up: { title: t("usedUpTitle"), body: t("usedUpBody") },
    not_found: { title: t("notFoundTitle"), body: t("notFoundBody") },
  }[kind];
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{copy.title}</h1>
      {link?.event ? <EventSummary event={link.event} /> : null}
      <p className={styles.lead} style={{ fontSize: "var(--text-body-size)" }}>
        {copy.body}
      </p>
      {kind === "expired" || kind === "revoked" ? <Alert tone="note">{t("botHint")}</Alert> : null}
      <Button href="/" variant="outline" icon="house" fullWidth>
        {t("goHome")}
      </Button>
    </div>
  );
}
