"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/lib/format";
import { Button } from "@/ui/Button";
import styles from "./Discourses.module.css";
import { renderQuoteImage, shareOrDownload } from "./quote-image";

type Props = {
  en: string;
  hi: string | null;
  /** Source line printed on the image: "<collection> · <date>". */
  source: string;
  /** Used for the downloaded file name. */
  slug: string;
  index?: number;
};

/** "Share as image" for one quote: client canvas card in the reader's language, with an alternate-language button. */
export function ShareQuote({ en, hi, source, slug, index = 0 }: Props) {
  const t = useTranslations("discourses");
  const locale = useLocale() as AppLocale;
  const [busy, setBusy] = useState<AppLocale | null>(null);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  const texts: Record<AppLocale, string | null> = { en, hi };
  const other: AppLocale = locale === "hi" ? "en" : "hi";

  async function go(lang: AppLocale) {
    const text = texts[lang];
    if (!text || busy) return;
    setBusy(lang);
    setMsg(null);
    try {
      const blob = await renderQuoteImage({
        text,
        lang,
        attribution: lang === "hi" ? "भगवान श्री सत्य साई बाबा" : "Bhagawan Sri Sathya Sai Baba",
        source,
        footer: "SSSSO Delhi NCR · saidelhi.org/discourses",
      });
      const r = await shareOrDownload(blob, `${slug}-${index + 1}-${lang}.png`, text);
      setMsg(r === "saved" ? { text: t("saved"), error: false } : null);
    } catch {
      setMsg({ text: t("shareFailed"), error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.shareRow}>
      <Button variant="outline" size="sm" icon="share-2" pending={busy === locale} onClick={() => go(locale)} disabled={!texts[locale]}>
        {t("shareImage")}
      </Button>
      {texts[other] ? (
        <Button
          variant="ghost"
          size="sm"
          icon="download"
          pending={busy === other}
          onClick={() => go(other)}
          lang={other}
          aria-label={`${t("shareImage")}: ${other === "hi" ? t("langHi") : t("langEn")}`}
        >
          {other === "hi" ? t("langHi") : t("langEn")}
        </Button>
      ) : null}
      <span role="status" className={msg?.error ? styles.shareErr : styles.shareOk}>
        {msg?.text}
      </span>
    </div>
  );
}
