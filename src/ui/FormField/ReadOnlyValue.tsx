import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "../Icon";
import { FormField } from "./FormField";
import styles from "./FormField.module.css";

export type ReadOnlyValueProps = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  help?: ReactNode;
};

/** A locked, prefilled value (e.g. samithi): shown in a grey box with a lock, not editable. */
export function ReadOnlyValue({ id, label, value, icon, help }: ReadOnlyValueProps) {
  const t = useTranslations("fieldKit");
  return (
    <FormField id={id} label={label} help={help} kind="group">
      <span className={styles.ctl} data-readonly="true" role="group" aria-labelledby={`${id}-label`} id={id}>
        {icon ? (
          <span className={styles.ctlIcon}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere", padding: "12px 0" }}>{value}</span>
        <span className={styles.ctlIcon}>
          <Icon name="lock" size={16} label={t("locked")} />
        </span>
      </span>
    </FormField>
  );
}
