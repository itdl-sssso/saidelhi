"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CSSProperties, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { Icon, type IconName } from "@/ui/Icon";
import { cx } from "@/ui/cx";
import { Ellipsis } from "./icons";
import styles from "./Admin.module.css";

/**
 * Closes on outside press, Escape (returns focus to the trigger), scroll and resize. The panel renders in a portal
 * with fixed positioning so list/table cards with `overflow: hidden` never clip it; it flips above the trigger
 * when there is no room below.
 */
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
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const w = wrap.current?.getBoundingClientRect();
    const h = panel.current?.offsetHeight ?? 0;
    if (!w) return;
    const below = window.innerHeight - w.bottom;
    const flip = h > below - 8 && w.top > below;
    const style: CSSProperties = { position: "fixed", top: flip ? Math.max(8, w.top - 6 - h) : w.bottom + 6 };
    if (align === "right") style.right = Math.max(8, window.innerWidth - w.right);
    else style.left = Math.max(8, w.left);
    setPos(style);
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const press = (e: MouseEvent | TouchEvent) => {
      const n = e.target as Node;
      if (wrap.current && !wrap.current.contains(n) && !panel.current?.contains(n)) setOpen(false);
    };
    const away = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false);
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
    window.addEventListener("scroll", away, true);
    window.addEventListener("resize", away);
    return () => {
      window.removeEventListener("scroll", away, true);
      window.removeEventListener("resize", away);
      document.removeEventListener("mousedown", press);
      document.removeEventListener("touchstart", press);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={wrap} className={cx(styles.menuWrap, wrapClassName)} onClick={(e) => e.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen((o) => !o), id, ref: btn })}
      {open
        ? createPortal(
            <div ref={panel} id={id} className={cx(styles.menu, className)} style={pos ?? { position: "fixed", visibility: "hidden", top: 0, left: 0 }}>
              {children(() => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
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
