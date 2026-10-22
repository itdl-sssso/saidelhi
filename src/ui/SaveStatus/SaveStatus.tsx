import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./SaveStatus.module.css";

/** local = saved on this device only; queued = waiting for signal; sending; sent; error = needs attention. */
export type SaveState = "local" | "queued" | "sending" | "sent" | "error";

const ICONS: Record<SaveState, IconName> = {
  local: "smartphone",
  queued: "cloud-off",
  sending: "loader-circle",
  sent: "circle-check",
  error: "circle-alert",
};

export type SaveStatusProps = {
  state: SaveState;
  children: ReactNode;
  className?: string;
};

/** "Saved on this phone · Not sent yet" / "Sent". A polite live region so changes are announced once. */
export function SaveStatus({ state, children, className }: SaveStatusProps) {
  return (
    <span className={cx(styles.status, styles[state], className)} role="status" aria-live="polite">
      <Icon name={ICONS[state]} size={16} className={state === "sending" ? styles.spin : undefined} />
      <span>{children}</span>
    </span>
  );
}
