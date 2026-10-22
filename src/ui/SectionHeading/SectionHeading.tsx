import type { HTMLAttributes, ReactNode } from "react";
import { Eyebrow } from "../Eyebrow";
import { cx } from "../cx";
import styles from "./SectionHeading.module.css";

export type SectionHeadingProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  level?: 1 | 2;
  /** id for the heading, to label a surrounding section via aria-labelledby. */
  titleId?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  level = 2,
  titleId,
  className,
  ...rest
}: SectionHeadingProps) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className={cx(styles.root, align === "center" && styles.center, className)} {...rest}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading id={titleId} className={cx(styles.title, level === 1 ? styles.h1 : styles.h2)}>
        {title}
      </Heading>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
  );
}
