"use client";

/* eslint-disable @next/next/no-img-element -- remote YouTube thumbnail shown only until the click-to-load player replaces it */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { type ArticleVideo as Video, youTubeThumb } from "@/contract";
import { Icon } from "@/ui/Icon";
import styles from "./ArticleView.module.css";

/** Click-to-load YouTube player (youtube-nocookie). Only the thumbnail is requested until the click. */
export function ArticleVideo({ video, title }: { video: Video; title: string }) {
  const t = useTranslations("news.video");
  const [playing, setPlaying] = useState(false);
  return (
    <div className={styles.video}>
      <div className={styles.player}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className={styles.facade} onClick={() => setPlaying(true)} aria-label={t("play", { title })}>
            <img src={youTubeThumb(video.id)} alt="" decoding="async" width={480} height={360} referrerPolicy="no-referrer" />
            <span className={styles.playBtn} aria-hidden="true">
              <Icon name="play" size={24} />
            </span>
          </button>
        )}
      </div>
      <p className={styles.videoMeta}>
        {playing ? t("privacy") : t("loadNote")}{" "}
        <a href={video.url} target="_blank" rel="noreferrer noopener">
          {t("watchOnYouTube")}
          <span className="sr-only"> {t("newTab")}</span>
        </a>
      </p>
    </div>
  );
}
