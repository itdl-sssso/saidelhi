"use client";

// Form controls shared by M6 dialogs and editors: bilingual pair, plain native select.
import { useTranslations } from "next-intl";
import { Input, Textarea } from "@/ui/Input";
import p from "./Parts.module.css";

export interface I18nValue {
  en: string;
  hi: string | null;
}

/** English + Hindi inputs side by side. Hindi is optional (empty = null, "Available in English" on the public site). */
export function I18nFields({
  label,
  value,
  onChange,
  error,
  multiline,
  requiredEn = true,
  rows = 3,
  maxLength,
}: {
  label: string;
  value: I18nValue;
  onChange: (v: I18nValue) => void;
  error?: string;
  multiline?: boolean;
  requiredEn?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  const t = useTranslations("admin.common");
  const En = multiline ? Textarea : Input;
  return (
    <div className={p.twoCol}>
      <En
        label={`${label} (${t("langEn")})`}
        value={value.en}
        onChange={(e) => onChange({ ...value, en: e.target.value })}
        error={error}
        optional={!requiredEn}
        maxLength={maxLength}
        {...(multiline ? { rows } : {})}
      />
      <En
        label={`${label} (${t("langHi")})`}
        lang="hi"
        value={value.hi ?? ""}
        onChange={(e) => onChange({ ...value, hi: e.target.value || null })}
        optional
        maxLength={maxLength}
        {...(multiline ? { rows } : {})}
      />
    </div>
  );
}

export const emptyI18n = (): I18nValue => ({ en: "", hi: null });
export const toI18n = (v: { en: string; hi: string | null } | null | undefined): I18nValue => ({ en: v?.en ?? "", hi: v?.hi ?? null });
