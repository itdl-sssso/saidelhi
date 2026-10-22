"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Icon, type IconName } from "@/ui/Icon";
import { cx } from "@/ui/cx";
import { Ellipsis } from "./icons";
import styles from "./Admin.module.css";

/** Closes on outside press and Escape (returns focus to the trigger). */
export function Popover({
  trigger,
  children,
  align = "right",
  className,
  wrapClassName,
}: {
  trigger: (p: { open: boolean; toggle: () => void; id: string; ref: React.Ref<HTMLButtonElement> }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
  wrapClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const press = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", press);
    document.addEventListener("touchstart", press);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", press);
      document.removeEventListener("touchstart", press);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={wrap} className={cx(styles.menuWrap, wrapClassName)} onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o), id, ref: btn })}
      {open ? (
        <div id={id} className={cx(styles.menu, align === "right" ? styles.menuR : styles.menuL, className)}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export type MenuEntry =
  | "-"
  | {
      label: ReactNode;
      icon?: IconName | LucideIcon;
      onClick?: () => void;
      href?: string;
      danger?: boolean;
      hidden?: boolean;
    };

function Glyph({ icon }: { icon?: IconName | LucideIcon }) {
  if (!icon) return null;
  return typeof icon === "string" ? <Icon name={icon} size={16} /> : <Icon icon={icon} size={16} />;
}

/** "⋯" button with a menu of actions. Hidden entries are removed (never disabled). */
export function RowMenu({ items, label }: { items: MenuEntry[]; label?: string }) {
  const t = useTranslations("admin.common");
  const shown = items.filter((i) => i === "-" || !i.hidden);
  if (!shown.some((i) => i !== "-")) return null;
  return (
    <Popover
      trigger={({ open, toggle, id, ref }) => (
        <button ref={ref} type="button" className={styles.icbtn} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={label ?? t("actions")} onClick={toggle}>
          <Icon icon={Ellipsis} size={20} />
        </button>
      )}
    >
      {(close) =>
        shown.map((it, i) =>
          it === "-" ? (
            <hr key={i} />
          ) : it.href ? (
            <Link key={i} href={it.href} className={it.danger ? styles.danger : undefined} onClick={close}>
              <Glyph icon={it.icon} />
              {it.label}
            </Link>
          ) : (
            <button
              key={i}
              type="button"
              className={it.danger ? styles.danger : undefined}
              onClick={() => {
                close();
                it.onClick?.();
              }}
            >
              <Glyph icon={it.icon} />
              {it.label}
            </button>
          ),
        )
      }
    </Popover>
  );
}
