import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../Icon";
import styles from "./Input.module.css";

export type FieldChrome = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
};

export function describedBy(id: string, { hint, error }: FieldChrome): string | undefined {
  const ids = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/** Label, hint and error around one control. Shared by Input, Textarea and Select. */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: FieldChrome & { id: string; children: ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className={styles.field}>
      {label ? (
        <label htmlFor={id} className={styles.label}>
          {label}
          {optional ? <span className={styles.optional}>{t("optional")}</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className={styles.error}>
          <Icon name="circle-x" size={16} />
          {error}
        </span>
      ) : null}
    </div>
  );
}
