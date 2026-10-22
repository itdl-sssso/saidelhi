"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { FormField, fieldIds, type FieldNote } from "../FormField/FormField";
import styles from "./Repeater.module.css";

export type RepeaterProps<Row> = {
  id: string;
  label: ReactNode;
  rows: Row[];
  /** Stable key per row (index is fine when rows are only appended/removed). */
  rowKey: (row: Row, index: number) => string;
  renderRow: (row: Row, index: number) => ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** "Person" → "Person 1", "Remove person 1". */
  itemLabel: string;
  addLabel: ReactNode;
  help?: ReactNode;
  optional?: boolean;
  badge?: ReactNode;
  messages?: FieldNote[];
  max?: number | null;
  disabled?: boolean;
  /** Shown when there are no rows yet. */
  empty?: ReactNode;
};

/** Add/remove rows of fields ("+ Add person"). Each row is a labelled group. */
export function Repeater<Row>({
  id,
  label,
  rows,
  rowKey,
  renderRow,
  onAdd,
  onRemove,
  itemLabel,
  addLabel,
  help,
  optional,
  badge,
  messages,
  max,
  disabled,
  empty,
}: RepeaterProps<Row>) {
  const t = useTranslations("fieldKit");
  const full = max != null && rows.length >= max;
  return (
    <FormField id={id} label={label} help={help} optional={optional} badge={badge} messages={messages} kind="group">
      <div id={id} role="group" aria-labelledby={fieldIds(id).label} className={styles.list}>
        {rows.length === 0 && empty ? <p className={styles.empty}>{empty}</p> : null}
        {rows.map((row, i) => {
          const name = `${itemLabel} ${i + 1}`;
          return (
            <div key={rowKey(row, i)} className={styles.row} role="group" aria-label={name} data-row={i}>
              <div className={styles.head}>
                <span className={styles.title}>{name}</span>
                <button type="button" className={styles.remove} onClick={() => onRemove(i)} disabled={disabled} aria-label={t("removeItem", { name })}>
                  <Icon name="trash-2" size={18} />
                </button>
              </div>
              <div className={styles.body}>{renderRow(row, i)}</div>
            </div>
          );
        })}
        <div>
          <Button variant="outline" icon="plus" onClick={onAdd} disabled={disabled || full}>
            {addLabel}
          </Button>
        </div>
      </div>
    </FormField>
  );
}
