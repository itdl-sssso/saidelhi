import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Badge } from "../Badge";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./SevaCard.module.css";

export type SevaCardProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  wing?: ReactNode;
  cadence?: ReactNode;
  location?: ReactNode;
  volunteers?: ReactNode;
  /** Makes the whole card a link target (the title carries the accessible name). */
  href?: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
};

export function SevaCard({
  title,
  description,
  icon = "hand-heart",
  wing,
  cadence,
  location,
  volunteers,
  href,
  headingLevel = 3,
  className,
}: SevaCardProps) {
  const Heading = `h${headingLevel}` as const;
  const hasMeta = cadence || location || volunteers;
  return (
    <article className={cx(styles.root, href && styles.linked, className)}>
      <div className={styles.top}>
        <span className={styles.glyph}>
          <Icon name={icon} size={24} />
        </span>
        {wing ? <Badge tone="prem">{wing}</Badge> : null}
      </div>
      <Heading className={styles.title}>
        {href ? (
          <Link href={href} className={styles.link}>
            {title}
          </Link>
        ) : (
          title
        )}
      </Heading>
      {description ? <p className={styles.description}>{description}</p> : null}
      {hasMeta ? (
        <div className={styles.meta}>
          {cadence ? (
            <span>
              <Icon name="repeat" size={16} />
              {cadence}
            </span>
          ) : null}
          {location ? (
            <span>
              <Icon name="map-pin" size={16} />
              {location}
            </span>
          ) : null}
          {volunteers ? (
            <span>
              <Icon name="users" size={16} />
              {volunteers}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
