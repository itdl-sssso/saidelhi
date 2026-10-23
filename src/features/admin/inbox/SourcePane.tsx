"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { InboxDetail, ThreadMessage } from "@/contract";
import type { AppLocale } from "@/lib/format";
import { Icon } from "@/ui/Icon";
import { FileText, RotateCw, ZoomIn, ZoomOut } from "../icons";
import { formatDate, formatTime } from "../time";
import { cx } from "@/ui/cx";
import s from "./Inbox.module.css";

/** Photo or scan with zoom and rotate. ID columns are blurred by the server; the note says so. */
export function ImageViewer({ url, name, scan }: { url: string; name: string; scan?: boolean }) {
  const t = useTranslations("admin.inbox.viewer");
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);
  return (
    <figure className={s.viewer}>
      <div className={s.viewerTools} role="group" aria-label={t("tools")}>
        <button type="button" className={s.tool} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label={t("zoomOut")} disabled={zoom <= 0.5}>
          <Icon icon={ZoomOut} size={18} />
        </button>
        <span className={s.zoomVal} aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className={s.tool} onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label={t("zoomIn")} disabled={zoom >= 3}>
          <Icon icon={ZoomIn} size={18} />
        </button>
        <button type="button" className={s.tool} onClick={() => setTurn((r) => (r + 90) % 360)} aria-label={t("rotate")}>
          <Icon icon={RotateCw} size={18} />
        </button>
      </div>
      <div className={s.viewerStage}>
        {/* eslint-disable-next-line @next/next/no-img-element -- private, authorised attachment URL */}
        <img src={url} alt={name} className={s.viewerImg} style={{ width: `${zoom * 100}%`, transform: `rotate(${turn}deg)` }} />
      </div>
      {scan ? (
        <figcaption className={s.idNote}>
          <Icon name="lock" size={16} />
          {t("idNote")}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Bubble({ m, locale }: { m: ThreadMessage; locale: AppLocale }) {
  const t = useTranslations("admin.inbox.viewer");
  return (
    <div className={cx(s.bub, m.dir === "in" ? s.bubIn : s.bubOut)}>
      {m.media?.kind === "image" ? <ImageViewer url={m.media.url} name={m.media.name} scan /> : null}
      {m.media && m.media.kind !== "image" ? (
        m.media.kind === "voice" ? (
          <audio controls src={m.media.url} className={s.audio} aria-label={m.media.name} />
        ) : (
          <a href={m.media.url} className={s.file} target="_blank" rel="noreferrer">
            <Icon icon={FileText} size={18} />
            {m.media.name}
          </a>
        )
      ) : null}
      {m.text ? <span>{m.text}</span> : null}
      <span className={s.bubMeta}>
        {m.dir === "out" ? `${t("fromUs")} · ` : ""}
        {formatTime(m.at, locale)}
      </span>
    </div>
  );
}

/** WhatsApp thread as bubbles grouped by day (inbox source pane and the WhatsApp conversation log). */
export function ThreadView({ messages }: { messages: ThreadMessage[] }) {
  const t = useTranslations("admin.inbox.viewer");
  const locale = useLocale() as AppLocale;
  const days: Array<{ day: string; items: ThreadMessage[] }> = [];
  for (const m of messages) {
    const day = formatDate(m.at, locale);
    const last = days[days.length - 1];
    if (last?.day === day) last.items.push(m);
    else days.push({ day, items: [m] });
  }
  return (
    <div className={s.chat} role="log" aria-label={t("thread")}>
      {days.map((g) => (
        <div key={g.day} className={s.chatDay}>
          <span className={s.day}>{g.day}</span>
          {g.items.map((m) => (
            <Bubble key={m.id} m={m} locale={locale} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Left pane: WhatsApp thread, scanned page or sheet. */
export function SourcePane({ d }: { d: InboxDetail }) {
  const t = useTranslations("admin.inbox.viewer");
  return (
    <div className={s.source}>
      {d.thread.length > 0 ? (
        <ThreadView messages={d.thread} />
      ) : d.raw.kind === "image" && d.raw.mediaUrl ? (
        <ImageViewer url={d.raw.mediaUrl} name={t("scanAlt")} scan />
      ) : (
        <div className={s.sheet}>
          <a href={d.raw.mediaUrl ?? undefined} className={s.file} target="_blank" rel="noreferrer">
            <Icon icon={FileText} size={18} />
            {t(d.raw.kind === "pdf" ? "openPdf" : "openSheet")}
          </a>
          {d.raw.text ? <pre className={s.sheetText}>{d.raw.text}</pre> : <p className={s.cap}>{t("noPreview")}</p>}
        </div>
      )}
      <p className={s.privacy}>
        <Icon name="lock" size={16} />
        {t("private")}
      </p>
    </div>
  );
}
