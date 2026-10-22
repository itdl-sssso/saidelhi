import { useLocale, useTranslations } from "next-intl";
import { formatCount, isSuppressed } from "../data/format";
import type { Figure } from "../data/types";

/** Screen-reader equivalent of a chart: one row per datum, estimates and gaps spelled out. */
export function DataTable({ title, rows }: { title: string; rows: { label: string; figure: Figure }[] }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const text = ({ value, estimate }: Figure) => {
    const base =
      value === null ? t("notReported") : isSuppressed(value) ? t("fewerThan5") : formatCount(value, locale);
    return estimate && value !== null ? `${base} (${t("estimate")})` : base;
  };
  return (
    <div className="sr-only">
      <table>
        <caption>{title}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{text(r.figure)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
