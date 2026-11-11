"use client";

/* eslint-disable @next/next/no-img-element -- remote poster shown only until the click-to-load player replaces it */

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { type ArticleVideo as Video, articleVideoThumb } from "@/contract";
import { Icon } from "@/ui/Icon";
import styles from "./ArticleView.module.css";

/** Cloudflare Stream player URL: autoplay after the click, captions on for the page language when available. */
export function streamPlayerSrc(video: Extract<Video, { provider: "cloudflare" }>, locale: string): string {
  const q = new URLSearchParams({ autoplay: "true", poster: video.posterUrl });
  if ((video.captions as string[]).includes(locale)) q.set("defaultTextTrack", locale);
  return `${video.iframeUrl}?${q}`;
}

/**
 * Click-to-load player. Only the poster is requested until the click; then YouTube (nocookie)
 * or the Cloudflare Stream iframe loads. Stream videos have no outbound link.
 */
export function ArticleVideo({ video, title }: { video: Video; title: string }) {
  const t = useTranslations("news.video");
  const locale = useLocale();
  const [playing, setPlaying] = useState(false);
  const yt = video.provider === "youtube";
  const src = video.provider === "youtube" ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0` : video.iframeUrl ? streamPlayerSrc(video, locale) : null;
  return (
    <div className={styles.video}>
      <div className={styles.player}>
        {playing && src ? (
          <iframe src={src} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : playing ? (
          <p className={styles.placeholder}>{t("placeholder")}</p>
        ) : (
          <button type="button" className={styles.facade} onClick={() => setPlaying(true)} aria-label={t("play", { title })}>
            <img src={articleVideoThumb(video)} alt="" decoding="async" width={480} height={360} referrerPolicy="no-referrer" />
            <span className={styles.playBtn} aria-hidden="true">
              <Icon name="play" size={24} />
            </span>
          </button>
        )}
      </div>
      <p className={styles.videoMeta}>
        {yt ? (playing ? t("privacy") : t("loadNote")) : playing ? t("privacyStream") : t("loadNoteStream")}
        {video.provider === "youtube" ? (
          <>
            {" "}
            <a href={video.url} target="_blank" rel="noreferrer noopener">
              {t("watchOnYouTube")}
              <span className="sr-only"> {t("newTab")}</span>
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
