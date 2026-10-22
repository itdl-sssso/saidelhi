"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/ui/Icon";
import { useToast } from "@/ui/Toast";
import styles from "./CentreView.module.css";

/** Centre phone shown as text with call and copy actions. Never a person's number. */
export function CopyNumber({ phone, label }: { phone: string; label: string }) {
  const t = useTranslations("centre");
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      toast.show({ tone: "success", message: t("copied", { phone }) });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show({ tone: "error", message: t("copyFailed") });
    }
  };

  return (
    <div className={styles.copy}>
      <Icon name="phone" size={18} />
      <span className={styles.copyText}>
        <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className={styles.copyNumber}>
          {phone}
        </a>
        <span className={styles.copyLabel}>{label}</span>
      </span>
      <button type="button" className={styles.iconBtn} onClick={copy} aria-label={t("copyNumber", { phone })}>
        <Icon name={copied ? "check" : "copy"} size={18} />
      </button>
    </div>
  );
}
