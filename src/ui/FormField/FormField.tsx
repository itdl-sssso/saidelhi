import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FieldMessage, type FieldMessageType } from "../FieldMessage";
import { cx } from "../cx";
import styles from "./FormField.module.css";

export type FieldNote = { type: FieldMessageType; text: ReactNode };

export type FormFieldProps = {
  /** Id of the control (single controls) or of the group (group controls). */
  id: string;
  label?: ReactNode;
  help?: ReactNode;
  optional?: boolean;
  /** Shown after the label, e.g. a "Personal data" badge or a lock. */
  badge?: ReactNode;
  messages?: FieldNote[];
  /**
   * "control": the label is a <label for=id>. "group": the label names a role=group
   * (yes/no, chips, repeaters) through aria-labelledby.
   */
  kind?: "control" | "group";
  className?: string;
  children: ReactNode;
};

export const fieldIds = (id: string) => ({ label: `${id}-label`, help: `${id}-help`, msg: `${id}-msg` });

/** aria-describedby for a control: messages first, then help. */
export function fieldDescribedBy(id: string, { help, messages }: Pick<FormFieldProps, "help" | "messages">): string | undefined {
  const ids = [messages?.length ? fieldIds(id).msg : null, help ? fieldIds(id).help : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export const hasError = (messages?: FieldNote[]) => !!messages?.some((m) => m.type === "error");
export const hasWarning = (messages?: FieldNote[]) => !!messages?.some((m) => m.type === "warning");

/** Label, help, messages around one field of the form kit (DS additions `sx-field`). */
export function FormField({ id, label, help, optional, badge, messages, kind = "control", className, children }: FormFieldProps) {
  const t = useTranslations("fieldKit");
  const ids = fieldIds(id);
  const labelContent = (
    <>
      {label}
      {optional ? <span className={styles.optional}>{t("optional")}</span> : null}
      {badge}
    </>
  );
  const body = (
    <>
      {label ? (
        kind === "control" ? (
          <label id={ids.label} htmlFor={id} className={styles.label}>
            {labelContent}
          </label>
        ) : (
          <span id={ids.label} className={styles.label}>
            {labelContent}
          </span>
        )
      ) : null}
      {help ? (
        <span id={ids.help} className={styles.help}>
          {help}
        </span>
      ) : null}
      {children}
      {messages?.length ? (
        <div id={ids.msg} className={styles.messages}>
          {messages.map((m, i) => (
            <FieldMessage key={i} type={m.type} srPrefix={m.type === "error" ? t("srError") : m.type === "warning" ? t("srWarning") : undefined}>
              {m.text}
            </FieldMessage>
          ))}
        </div>
      ) : null}
    </>
  );
  return (
    <div className={cx(styles.field, className)} data-field={id}>
      {body}
    </div>
  );
}
