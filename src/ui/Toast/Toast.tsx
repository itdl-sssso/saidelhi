"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./Toast.module.css";

export type ToastTone = "success" | "info" | "error" | "offline";

export type ToastOptions = {
  tone?: ToastTone;
  message: ReactNode;
  action?: { label: string; onClick: () => void };
  /** Milliseconds; toasts with an action stay until dismissed. */
  duration?: number;
};

type ToastItem = ToastOptions & { id: number };

const ICONS: Record<ToastTone, IconName> = {
  success: "check",
  info: "info",
  error: "x",
  offline: "wifi-off",
};

type ToastApi = { show: (options: ToastOptions) => number; dismiss: (id: number) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    const id = nextId.current;
    setItems((list) => [...list.slice(-2), { ...options, id }]);
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section className={styles.region} aria-live="polite" aria-label={t("notifications")}>
        {items.map((item) => (
          <ToastView key={item.id} item={item} dismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

function ToastView({ item, dismiss }: { item: ToastItem; dismiss: (id: number) => void }) {
  const t = useTranslations("common");
  const { id, tone = "success", message, action, duration = 6000 } = item;
  const onDismiss = () => dismiss(id);

  useEffect(() => {
    if (action) return;
    const timer = window.setTimeout(() => dismiss(id), duration);
    return () => window.clearTimeout(timer);
  }, [id, action, duration, dismiss]);

  return (
    <div className={styles.toast}>
      <span className={cx(styles.glyph, styles[tone])}>
        <Icon name={ICONS[tone]} size={16} />
      </span>
      <span className={styles.message}>{message}</span>
      {action ? (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
        >
          {action.label}
        </button>
      ) : null}
      <button type="button" className={styles.dismiss} aria-label={t("dismiss")} onClick={onDismiss}>
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
