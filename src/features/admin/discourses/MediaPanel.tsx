"use client";

import { useTranslations } from "next-intl";
import type { AdminDiscourseMedia } from "@/contract";
import { Button } from "@/ui/Button";
import { Pill, type Tone, Panel } from "../kit";
import styles from "../Admin.module.css";
import d from "./Discourses.module.css";

const mmss = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")}h` : `${m} min`;
};

const TONE: Record<"high" | "medium" | "low" | "official", Tone> = { high: "green", medium: "yellow", low: "slate", official: "blue" };

/** Audio/video candidates of one discourse: open the link, check it is the right talk, approve or hide. */
export function MediaPanel({ media, canReview, pendingId, onToggle }: { media: AdminDiscourseMedia[]; canReview: boolean; pendingId: string | null; onToggle: (m: AdminDiscourseMedia) => void }) {
  const t = useTranslations("admin.discourses");
  const approved = media.filter((m) => m.approved).length;
  return (
    <Panel title={t("media.title")} badge={<span className={styles.cap}>{t("media.count", { n: approved, total: media.length })}</span>}>
      <p className={styles.cap}>{t("media.help")}</p>
      {media.length === 0 ? <p className={styles.cap}>{t("media.empty")}</p> : null}
      <ul className={d.mediaList}>
        {media.map((m) => {
          const tone = TONE[m.confidence ?? "official"];
          const label = m.title || m.url;
          return (
            <li key={m.id} className={d.mediaItem}>
              <div className={d.mediaHead}>
                <Pill tone={m.kind === "audio" ? "blue" : "slate"} icon={m.kind === "audio" ? "headphones" : "video"}>
                  {t(`media.kind.${m.kind}`)}
                </Pill>
                <Pill tone={tone}>{m.confidence ? t(`media.confidence.${m.confidence}`) : t("media.confidence.official")}</Pill>
                {m.approved ? <Pill tone="green">{t("media.approved")}</Pill> : <Pill tone="slate">{t("media.hidden")}</Pill>}
              </div>
              <a href={m.sourcePage ?? m.url} target="_blank" rel="noreferrer noopener" className={styles.textLink}>
                {label}
                <span className="sr-only"> {t("media.newTab")}</span>
              </a>
              <span className={styles.cap}>
                {[m.channel, m.durationS ? mmss(m.durationS) : null, m.recordedDate, m.official ? null : t("media.unofficial")].filter(Boolean).join(" · ")}
              </span>
              {canReview ? (
                <div className={styles.row}>
                  <Button
                    size="sm"
                    variant={m.approved ? "ghost" : "secondary"}
                    icon={m.approved ? "eye-off" : "check"}
                    disabled={pendingId === m.id}
                    aria-label={`${m.approved ? t("media.hide") : t("media.approve")}: ${label}`}
                    onClick={() => onToggle(m)}
                  >
                    {m.approved ? t("media.hide") : t("media.approve")}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
