"use client";

/* eslint-disable @next/next/no-img-element -- remote YouTube thumbnail shown only until the click-to-load player replaces it */

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DiscourseMedia } from "@/contract";
import { Icon } from "@/ui/Icon";
import styles from "./Discourses.module.css";

function AudioItem({ m }: { m: DiscourseMedia }) {
  const t = useTranslations("discourses.media");
  const label = m.title || t("audioFallback");
  return (
    <li className={styles.mediaCard}>
      <span className={styles.mediaKind}>
        <Icon name="headphones" size={16} /> {t("audio")}
      </span>
      <b className={styles.mediaTitle} lang="en">
        {label}
      </b>
      <audio controls preload="none" src={m.url} aria-label={t("audioLabel", { title: label })} className={styles.audio} />
      <span className={styles.mediaMeta}>
        {t("audioCredit")}
        {m.sourcePage ? (
          <>
            {" · "}
            <a href={m.sourcePage} target="_blank" rel="noreferrer noopener">
              {t("audioSource")}
              <span className="sr-only"> {t("newTab")}</span>
            </a>
          </>
        ) : null}
      </span>
    </li>
  );
}

function VideoItem({ m }: { m: DiscourseMedia }) {
  const t = useTranslations("discourses.media");
  const [playing, setPlaying] = useState(false);
  const id = m.externalId ?? "";
  const label = m.title || t("videoFallback");
  return (
    <li className={styles.mediaCard}>
      <span className={styles.mediaKind}>
        <Icon name="video" size={16} /> {t("video")}
      </span>
      <b className={styles.mediaTitle} lang="en">
        {label}
      </b>
      <div className={styles.player}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`}
            title={label}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className={styles.facade} onClick={() => setPlaying(true)} aria-label={t("playLabel", { title: label })}>
            <img src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" width={480} height={360} referrerPolicy="no-referrer" />
            <span className={styles.playBtn} aria-hidden="true">
              <Icon name="play" size={24} />
            </span>
          </button>
        )}
      </div>
      <span className={styles.mediaMeta}>
        {[m.channel ? t("channel", { channel: m.channel }) : null, m.durationS ? t("duration", { count: Math.max(1, Math.round(m.durationS / 60)) }) : null].filter(Boolean).join(" · ")}
      </span>
      {playing ? <span className={styles.mediaMeta}>{t("privacy")}</span> : <span className={styles.mediaMeta}>{t("loadNote")}</span>}
      {!m.official ? <span className={styles.mediaWarn}>{t("unofficial")}</span> : null}
      <a href={m.url} target="_blank" rel="noreferrer noopener" className={styles.mediaLink}>
        {t("openYoutube")}
        <span className="sr-only"> {t("newTab")}</span>
      </a>
    </li>
  );
}

/** "Listen and watch": official audio first, then video; YouTube loads only after a click (no tracking until then). */
export function DiscourseMediaSection({ media }: { media: DiscourseMedia[] }) {
  const t = useTranslations("discourses.media");
  if (!media.length) return null;
  return (
    <section className={styles.mediaSection} aria-labelledby="dm-title">
      <h2 id="dm-title" className={styles.mediaHd}>
        {t("title")}
      </h2>
      <p className={styles.mediaMeta}>{t("note")}</p>
      <ul className={styles.mediaList}>
        {media.map((m) => (m.kind === "audio" ? <AudioItem key={m.id} m={m} /> : m.externalId ? <VideoItem key={m.id} m={m} /> : null))}
      </ul>
    </section>
  );
}
