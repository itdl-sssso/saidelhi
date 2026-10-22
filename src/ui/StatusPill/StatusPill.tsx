import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { EventStatus } from "../data/types";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./StatusPill.module.css";

type Tone = "slate" | "yellow" | "blue" | "pink" | "green" | "alert";

/** Fixed by docs/specs/README.md "Event lifecycle status pills". Label always accompanies colour. */
export const STATUS_STYLE: Record<EventStatus, { tone: Tone; icon: IconName }> = {
  draft: { tone: "slate", icon: "file-pen-line" },
  awaiting_approval: { tone: "yellow", icon: "hourglass" },
  planned: { tone: "blue", icon: "calendar-check" },
  awaiting_report: { tone: "pink", icon: "clipboard-list" },
  report_submitted: { tone: "yellow", icon: "send" },
  approved: { tone: "green", icon: "circle-check" },
  cancelled: { tone: "slate", icon: "circle-x" },
  postponed: { tone: "slate", icon: "calendar-clock" },
  escalated: { tone: "alert", icon: "triangle-alert" },
};

export type StatusPillProps = {
  status: EventStatus;
  size?: "md" | "lg";
  /** Event date shown beside the pill; struck through when the event is cancelled. */
  date?: ReactNode;
  dateTime?: string;
  className?: string;
};

export function StatusPill({ status, size = "md", date, dateTime, className }: StatusPillProps) {
  const t = useTranslations("status");
  const { tone, icon } = STATUS_STYLE[status];
  const pill = (
    <span className={cx(styles.pill, styles[tone], size === "lg" && styles.lg, !date && className)}>
      <Icon name={icon} size={16} />
      {t(status)}
    </span>
  );
  if (!date) return pill;
  const cancelled = status === "cancelled";
  return (
    <span className={cx(styles.wrap, className)}>
      {pill}
      <time dateTime={dateTime} className={cx(styles.date, cancelled && styles.struck)}>
        {cancelled ? <del>{date}</del> : date}
      </time>
    </span>
  );
}
