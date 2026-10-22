"use client";

import { useTranslations } from "next-intl";
import type { AnswerMap, FormDefinition } from "@/contract";
import { formatIsoDate, type AppLocale } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { reviewSummary, type DisplayCtx, type ReviewItem } from "../model";
import styles from "./formlink.module.css";

/** Display helpers for the review step and the done page. */
export function useDisplayCtx(locale: AppLocale): DisplayCtx {
  const t = useTranslations("formlink");
  const k = useTranslations("fieldKit");
  const tag = locale === "hi" ? "hi-IN" : "en-IN";
  return {
    lang: locale,
    yes: k("yes"),
    no: k("no"),
    formatDate: (iso) => formatIsoDate(iso, locale),
    formatTime: (hhmm) => hhmm,
    files: (n) => t("fileCount", { n }),
    number: (n) => n.toLocaleString(tag),
  };
}

function Item({ item }: { item: ReviewItem }) {
  const t = useTranslations("formlink");
  return (
    <div className={styles.sumItem}>
      <dt>{item.label}</dt>
      <dd className={item.value === null ? styles.muted : undefined}>{item.value ?? t("notAnswered")}</dd>
    </div>
  );
}

/** Every visible answer, section by section, with a Change button per section (spec 20 step 8). */
export function ReviewSummary({
  def,
  answers,
  locale,
  onChange,
  sectionsWithErrors,
}: {
  def: FormDefinition;
  answers: AnswerMap;
  locale: AppLocale;
  onChange?: (sectionIndex: number) => void;
  sectionsWithErrors?: ReadonlySet<number>;
}) {
  const t = useTranslations("formlink");
  const ctx = useDisplayCtx(locale);
  const sections = reviewSummary(def, answers, ctx, (n) => t("row", { n }));
  return (
    <div className={styles.summary}>
      {sections.map((s) => (
        <section key={s.index} className={styles.sumCard} aria-labelledby={`rev-${s.index}`}>
          <div className={styles.sumHead}>
            <h3 id={`rev-${s.index}`}>
              {s.personal ? <Icon name="shield-check" size={16} label={t("personalSection")} /> : null} {s.title}
            </h3>
            {onChange ? (
              <Button type="button" variant={sectionsWithErrors?.has(s.index) ? "outline" : "quiet"} size="sm" icon="pencil" onClick={() => onChange(s.index)}>
                {t("change")}
              </Button>
            ) : null}
          </div>
          <dl className={styles.sumList}>
            {s.rows.map((r, i) =>
              r.kind === "item" && r.item ? (
                <Item key={r.item.path} item={r.item} />
              ) : (
                <div key={i} className={styles.sumGroup}>
                  <p className={styles.sumGroupTitle}>{r.title}</p>
                  {r.items?.map((it) => <Item key={it.path} item={it} />)}
                </div>
              ),
            )}
          </dl>
        </section>
      ))}
    </div>
  );
}
