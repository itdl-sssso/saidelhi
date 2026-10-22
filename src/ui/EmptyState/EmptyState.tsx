import type { ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./EmptyState.module.css";

export type EmptyStateProps = {
  title: ReactNode;
  body?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
};

export function EmptyState({ title, body, icon = "sun", action, headingLevel = 3, className }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cx(styles.root, className)}>
      <span className={styles.glyph}>
        <Icon name={icon} size={24} />
      </span>
      <Heading className={styles.title}>{title}</Heading>
      {body ? <p className={styles.body}>{body}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
