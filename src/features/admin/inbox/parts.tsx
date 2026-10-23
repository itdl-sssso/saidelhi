"use client";

import { useTranslations } from "next-intl";
import type { Confidence, Source } from "@/contract";
import { Icon } from "@/ui/Icon";
import { Pill } from "../kit";
import { FileText, MessageCircle, ScanLine } from "../icons";
import s from "./Inbox.module.css";

const CONF = { high: ["green", "circle-check"], check: ["yellow", "triangle-alert"], low: ["pink", "circle-alert"] } as const;

/** AI confidence as text plus icon (never colour alone). */
export function ConfPill({ level }: { level: Confidence }) {
  const t = useTranslations("admin.inbox.confidence");
  const [tone, icon] = CONF[level];
  return (
    <Pill tone={tone} icon={icon}>
      {t(level)}
    </Pill>
  );
}

const ICON = { whatsapp: MessageCircle, scan: ScanLine, upload: FileText, form: FileText, portal: FileText } as const;

export function SourceIcon({ source, size = 20 }: { source: Source; size?: 16 | 18 | 20 }) {
  const t = useTranslations("admin.inbox.source");
  return (
    <span className={s.srcIc}>
      <Icon icon={ICON[source]} size={size} label={t(source)} />
    </span>
  );
}

/** "Today" / "1 day" / "3 days". */
export function useAge() {
  const t = useTranslations("admin.inbox");
  return (days: number) => t("age", { n: days });
}
