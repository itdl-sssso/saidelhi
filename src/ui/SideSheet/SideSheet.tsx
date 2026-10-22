"use client";

import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useNativeDialog } from "../Dialog/useNativeDialog";
import { Icon } from "../Icon";
import { cx } from "../cx";
import styles from "./SideSheet.module.css";

export type SideSheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Right-hand panel on desktop; bottom sheet suits phones. */
  side?: "right" | "bottom";
  className?: string;
};

export function SideSheet({ open, onClose, title, children, footer, side = "right", className }: SideSheetProps) {
  const t = useTranslations("common");
  const titleId = useId();
  const dialog = useNativeDialog(open, onClose);
  return (
    <dialog {...dialog} aria-labelledby={titleId} className={cx(styles.sheet, styles[side], className)}>
      {side === "bottom" ? <div className={styles.grab} role="presentation" /> : null}
      <div className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <button type="button" className={styles.close} aria-label={t("close")} onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </dialog>
  );
}
