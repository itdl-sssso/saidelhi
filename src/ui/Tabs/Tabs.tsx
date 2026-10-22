"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Tabs.module.css";

export type TabItem = { id: string; label: ReactNode; panel?: ReactNode };

export type TabsProps = {
  tabs: TabItem[];
  /** Accessible name for the tab list. */
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
};

export function Tabs({ tabs, label, value, defaultValue, onChange, className }: TabsProps) {
  const baseId = useId();
  const [inner, setInner] = useState(defaultValue ?? tabs[0]?.id);
  const current = value ?? inner;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasPanels = tabs.some((t) => t.panel !== undefined);

  const select = (id: string) => {
    setInner(id);
    onChange?.(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === current);
    const last = tabs.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    select(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
        {tabs.map((t, i) => {
          const selected = t.id === current;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={hasPanels ? `${baseId}-panel-${t.id}` : undefined}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => select(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {hasPanels
        ? tabs.map((t) => (
            <div
              key={t.id}
              role="tabpanel"
              id={`${baseId}-panel-${t.id}`}
              aria-labelledby={`${baseId}-tab-${t.id}`}
              hidden={t.id !== current}
              tabIndex={0}
              className={styles.panel}
            >
              {t.panel}
            </div>
          ))
        : null}
    </div>
  );
}
