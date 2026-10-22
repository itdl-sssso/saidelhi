import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconAfter?: IconName;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
};

type AsButton = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & {
    href?: undefined;
    /** Shows a spinner, sets aria-busy and blocks further clicks. */
    pending?: boolean;
  };

type AsLink = Common &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof Common | "href"> & {
    href: string;
    /** Opens in a new tab and says so to screen readers. */
    external?: boolean;
  };

export type ButtonProps = AsButton | AsLink;

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconAfter,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) {
  const t = useTranslations("common");
  const iconSize = size === "lg" ? 20 : size === "sm" ? 16 : 18;
  const classes = cx(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    className,
  );

  if (rest.href !== undefined) {
    const { href, external, ...anchor } = rest;
    const content = (
      <>
        {icon ? <Icon name={icon} size={iconSize} /> : null}
        {children}
        {iconAfter ? <Icon name={iconAfter} size={iconSize} /> : null}
        {external ? <span className="sr-only"> {t("opensNewTab")}</span> : null}
      </>
    );
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...anchor}>
        {content}
      </a>
    ) : (
      <Link href={href} className={classes} {...anchor}>
        {content}
      </Link>
    );
  }

  const { pending, disabled, type = "button", ...button } = rest;
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...button}
    >
      {pending ? (
        <Icon name="loader-circle" size={iconSize} className={styles.spin} />
      ) : icon ? (
        <Icon name={icon} size={iconSize} />
      ) : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={iconSize} /> : null}
    </button>
  );
}
