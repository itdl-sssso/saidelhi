"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Icon } from "@/ui/Icon";
import styles from "./Discourses.module.css";

/** Search box: debounced, writes `?q` (keeping `?theme`) so the results are server-rendered. */
export function DiscourseSearch({ q, theme }: { q: string; theme?: string }) {
  const t = useTranslations("discourses");
  const router = useRouter();
  const [value, setValue] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const last = useRef(q);

  useEffect(() => () => clearTimeout(timer.current), []);

  function push(next: string) {
    const trimmed = next.trim();
    if (trimmed === last.current) return;
    last.current = trimmed;
    const query: Record<string, string> = {};
    if (theme) query.theme = theme;
    if (trimmed) query.q = trimmed;
    router.replace({ pathname: "/discourses", query }, { scroll: false });
  }

  return (
    <form
      role="search"
      className={styles.search}
      onSubmit={(e) => {
        e.preventDefault();
        clearTimeout(timer.current);
        push(value);
      }}
    >
      <Icon name="search" size={18} />
      <input
        type="search"
        name="q"
        value={value}
        maxLength={80}
        aria-label={t("searchLabel")}
        placeholder={t("searchPlaceholder")}
        onChange={(e) => {
          setValue(e.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => push(e.target.value), 350);
        }}
      />
    </form>
  );
}
