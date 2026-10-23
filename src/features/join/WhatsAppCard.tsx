"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import type { WhatsAppContact } from "@/contract";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { useToast } from "@/ui/Toast";
import styles from "./Join.module.css";

/** The bot's number as text, a Copy button and a QR code (made in the browser from the wa.me link). */
export function WhatsAppCard({ contact }: { contact: WhatsAppContact }) {
  const t = useTranslations("join");
  const toast = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { number, waMeUrl, keyword } = contact;

  useEffect(() => {
    if (!waMeUrl) return;
    let live = true;
    QRCode.toDataURL(waMeUrl, { margin: 1, width: 240, errorCorrectionLevel: "M" }).then(
      (url) => {
        if (live) setQr(url);
      },
      () => {
        /* the number and the link still work without the picture */
      },
    );
    return () => {
      live = false;
    };
  }, [waMeUrl]);

  const copy = async () => {
    if (!number) return;
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      toast.show({ tone: "success", message: t("copied", { number }) });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show({ tone: "error", message: t("copyFailed") });
    }
  };

  if (!number || !waMeUrl) {
    return (
      <div className={styles.soon}>
        <Icon name="message-circle" size={20} />
        <span>{t("waSoon")}</span>
      </div>
    );
  }

  return (
    <div className={styles.wa}>
      <div className={styles.number}>
        <Icon name="message-circle" size={20} />
        <b>
          <a href={waMeUrl} target="_blank" rel="noopener noreferrer">
            {number}
            <span className="sr-only"> {t("opensNewTab")}</span>
          </a>
        </b>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" icon={copied ? "check" : "copy"} onClick={copy} aria-label={t("copyNumber", { number })}>
          {t("copy")}
        </Button>
      </div>
      <div className={styles.qr}>
        <div className={styles.qrBox}>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- generated data URL, nothing to optimise
            <img src={qr} alt={t("qrAlt", { number })} width={104} height={104} />
          ) : (
            <Icon name="smartphone" size={24} />
          )}
        </div>
        <span className={styles.cap}>{t("qrCaption", { keyword })}</span>
      </div>
    </div>
  );
}
