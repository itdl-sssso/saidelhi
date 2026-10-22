import type { HTMLAttributes } from "react";

/** The Sarva Dharma rule: 2px under the header, 3px above the footer, 4–6px as a card or dialog cap. */
export type DharmaRuleProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  height?: 2 | 3 | 4 | 6;
};

export function DharmaRule({ height = 3, style, ...rest }: DharmaRuleProps) {
  return (
    <div
      role="presentation"
      style={{ height, width: "100%", flex: "none", background: "var(--dharma-rule)", ...style }}
      {...rest}
    />
  );
}
