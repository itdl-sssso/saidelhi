"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon";
import { cx } from "../cx";
import { useNativeDialog } from "./useNativeDialog";
import styles from "./Dialog.module.css";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  className?: string;
};

export function Dialog({ open, onClose, title, children, footer, width = 460, className }: DialogProps) {
  const t = useTranslations("common");
  const titleId = useId();
  const dialog = useNativeDialog(open, onClose);
  return (
    <dialog
      {...dialog}
      aria-labelledby={titleId}
      className={cx(styles.dialog, className)}
      style={{ "--dialog-w": `${width}px` } as CSSProperties}
    >
      <div className={styles.cap} role="presentation" />
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label={t("close")} onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>
        {children ? <div className={styles.body}>{children}</div> : null}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </dialog>
  );
}
