import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Eyebrow } from "@/ui/Eyebrow";
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
