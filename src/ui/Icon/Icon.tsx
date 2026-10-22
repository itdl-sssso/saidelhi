import type { LucideIcon } from "lucide-react";
import { icons, type IconName } from "./registry";

export type IconSize = 16 | 18 | 20 | 24;

type Source = { name: IconName; icon?: never } | { icon: LucideIcon; name?: never };

export type IconProps = Source & {
  size?: IconSize;
  /** When set the icon is announced; otherwise it is decorative. */
  label?: string;
  className?: string;
};

export function Icon({ name, icon, size = 20, label, className }: IconProps) {
  const Glyph = icon ?? icons[name as IconName];
  return (
    <Glyph
      size={size}
      strokeWidth={1.75}
      color="currentColor"
      className={className}
      focusable={false}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      style={{ flex: "none" }}
    />
  );
}
