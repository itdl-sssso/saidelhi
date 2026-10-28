import type { ReactNode } from "react";
import Image from "next/image";
import { Icon, type IconName } from "@/ui/Icon";
import { cx } from "@/ui/cx";
import styles from "./ImageSlot.module.css";

/**
 * A picture frame that shows a quiet dashed placeholder until the real image is supplied
 * (design: image-slot.js). Pass `src` and the placeholder is replaced; nothing else changes.
 */
export function ImageSlot({
  src,
  alt = "",
  sizes,
  label,
  icon = "image",
  className,
}: {
  src?: string | null;
  alt?: string;
  sizes?: string;
  /** Visible caption of the empty state, e.g. "Centenary image to come". */
  label?: ReactNode;
  icon?: IconName;
  className?: string;
}) {
  return (
    <div className={cx(styles.slot, className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className={styles.img} />
      ) : (
        <div className={styles.empty}>
          <Icon name={icon} size={24} />
          {label ? <span>{label}</span> : null}
        </div>
      )}
    </div>
  );
}
