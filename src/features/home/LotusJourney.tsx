import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
import { HomeSnap } from "./HomeSnap";
import { JourneyStage } from "./JourneyStage";
import { VALUE_ICON, VALUE_KEYS, valueEmblem, valuePhoto } from "./values";
import styles from "./LotusJourney.module.css";

const ACTS = ["act0", "act1", "act2", "act3"] as const;

/**
 * Spec 01 hero: the 3D lotus journey (design: A2 3D Lotus Journey, a2-app-v2.jsx).
 * Act I opens the lotus over four short statements; Act II visits each of the five
 * value petals. All copy is server-rendered; the 3D stage is a lazy client island.
 */
export function LotusJourney() {
  const t = useTranslations("home");
  return (
    <div className={styles.journey} data-act="0" data-focus="-1" data-tone="dark" data-hint="1">
      {/* Design's "Lighting the lamp…" veil: first paint, lifted by JourneyStage (first 3D frame,
          static mode, or a time cap). Hidden without JS so the poster is never covered. */}
      <div className={styles.veil} aria-hidden="true">
        <span className={styles.jyoti}>
          <span className={styles.jyotiHalo} />
          <svg className={styles.jyotiFlame} viewBox="0 0 60 150" focusable="false">
            <defs>
              <radialGradient id="jyoti-outer" cx="50%" cy="72%" r="62%">
                <stop offset="0" stopColor="#fffdf2" />
                <stop offset="0.3" stopColor="#ffe9a0" />
                <stop offset="0.62" stopColor="#ffb84a" />
                <stop offset="0.86" stopColor="#ff8a1f" stopOpacity="0.75" />
                <stop offset="1" stopColor="#ff6a00" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="jyoti-core" cx="50%" cy="70%" r="55%">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.55" stopColor="#fff7d6" />
                <stop offset="1" stopColor="#ffe28a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="jyoti-base" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#7fb4ff" stopOpacity="0.85" />
                <stop offset="1" stopColor="#3a6dff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g className={styles.jyotiBody}>
              <path
                d="M30 2C35 30 55 62 55 94c0 21-11 34-25 34S5 115 5 94C5 62 25 30 30 2Z"
                fill="url(#jyoti-outer)"
              />
              <path
                className={styles.jyotiCore}
                d="M30 46c4 17 14 34 14 52 0 14-6 23-14 23s-14-9-14-23c0-18 10-35 14-52Z"
                fill="url(#jyoti-core)"
              />
              <ellipse cx="30" cy="120" rx="10" ry="7" fill="url(#jyoti-base)" />
            </g>
            <path d="M30 104q1.5 14 0 30" stroke="#2a1a10" strokeWidth="2.4" strokeLinecap="round" fill="none" />
            <circle cx="30.4" cy="105" r="1.6" fill="#ff9a3c" />
          </svg>
        </span>
        {t("lighting")}
      </div>
      <noscript>
        <style>{`.${styles.veil}{display:none}`}</style>
      </noscript>
      <HomeSnap />
      <JourneyStage photos={VALUE_KEYS.map((k) => ({ key: k, src: valuePhoto(k) }))} />

      <section id="act1" className={styles.act1} aria-labelledby="home-title">
        <div className={styles.pin}>
          <div className={styles.acts}>
            {ACTS.map((a, i) => (
              <div key={a} className={styles.act} data-index={i}>
                <p className={styles.actEyebrow}>{t(`${a}.eyebrow`)}</p>
                {i === 0 ? (
                  <h1 id="home-title" className={styles.actTitle}>
                    {t(`${a}.title`)}
                  </h1>
                ) : (
                  <h2 className={styles.actTitle}>{t(`${a}.title`)}</h2>
                )}
                <p className={styles.actBody}>{t(`${a}.body`)}</p>
              </div>
            ))}
          </div>
          <a href="#act2" className={styles.hint}>
            {t("scrollHint")}
          </a>
        </div>
      </section>

      <div id="act2" className={styles.act2}>
        {VALUE_KEYS.map((k, i) => (
          <section
            key={k}
            id={`petal-${k}`}
            className={styles.petal}
            data-index={i}
            aria-labelledby={`petal-${k}-title`}
          >
            <div className={styles.panel}>
              {/* Phones: the photo that rides on the lotus heart on wide screens sits on the card instead.
                  Shown whole; a blurred copy fills the strip beside it. */}
              <div className={styles.cardPhoto}>
                <Image src={valuePhoto(k)} alt="" fill sizes="(min-width: 900px) 0px, 92vw" loading="lazy" className={styles.cardPhotoFill} />
                <Image src={valuePhoto(k)} alt="" fill sizes="(min-width: 900px) 0px, 92vw" loading="lazy" className={styles.cardPhotoImg} />
              </div>
              <div className={styles.crest}>
                <Image src={valueEmblem(k)} alt="" width={52} height={52} />
              </div>
              <Eyebrow>{t("valueOf", { n: i + 1 })}</Eyebrow>
              <h2 id={`petal-${k}-title`} className={styles.petalTitle}>
                {t(`values.${k}.name`)}
              </h2>
              <p className={styles.gloss}>{t(`values.${k}.gloss`)}</p>
              <blockquote className={styles.quote}>
                <p>{t(`values.${k}.quote`)}</p>
              </blockquote>
              <p className={styles.attrib}>{t("attribution")}</p>
              <p className={styles.body}>{t(`values.${k}.body`)}</p>
              <div className={styles.foot}>
                <Button href={`/values/${k}`} icon={VALUE_ICON[k]} iconAfter="arrow-right">
                  {t(`values.${k}.cta`)}
                </Button>
                <Badge tone="shanti">{t(`values.${k}.when`)}</Badge>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
