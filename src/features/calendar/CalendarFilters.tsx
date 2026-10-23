"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { type OrgUnit, type SevaType, endpoints } from "@/contract";
import { useRouter } from "@/i18n/navigation";
import { apiRequest } from "@/lib/api";
import { type AppLocale, tx } from "@/lib/format";
import { useHydrated } from "@/lib/useHydrated";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/Icon";
import { Select } from "@/ui/Select";
import { SideSheet } from "@/ui/SideSheet";
import { type CalendarState, activeFilterCount, calendarQuery } from "./model";
import styles from "./Calendar.module.css";

export type Option = { value: string; label: string };
export type SamithiOption = Option & { district: string };

type Filters = Pick<CalendarState, "district" | "sevaType" | "samithi" | "volunteers">;

/** Filter options from the public org-units API (CONTRACT v0.5); the server-rendered options stay until it answers. */
function useOrgOptions(locale: AppLocale): { districts: Option[]; samithis: SamithiOption[] } | null {
  const [units, setUnits] = useState<{ districts: Option[]; samithis: SamithiOption[] } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([apiRequest<OrgUnit[]>(endpoints.orgUnits({ kind: "district" }), { locale }), apiRequest<OrgUnit[]>(endpoints.orgUnits({ kind: "samithi" }), { locale })]).then(([d, sm]) => {
      if (!live || !d.ok || !sm.ok) return;
      const slugById = new Map(d.data.map((x) => [x.id, x.slug]));
      const byLabel = (a: Option, b: Option) => a.label.localeCompare(b.label, locale);
      setUnits({
        districts: d.data.map((x) => ({ value: x.slug, label: tx(x.name, locale) })).sort(byLabel),
        samithis: sm.data
          .filter((x) => x.parentId && slugById.has(x.parentId))
          .map((x) => ({ value: x.slug, label: tx(x.name, locale), district: slugById.get(x.parentId as string) as string }))
          .sort(byLabel),
      });
    });
    return () => {
      live = false;
    };
  }, [locale]);
  return units;
}

export function CalendarFilters({
  state,
  today,
  districts: serverDistricts,
  samithis: serverSamithis,
  sevaTypes,
}: {
  state: CalendarState;
  today: string;
  districts: Option[];
  samithis: SamithiOption[];
  sevaTypes: Option[];
}) {
  const t = useTranslations("calendar");
  const locale = useLocale() as AppLocale;
  const units = useOrgOptions(locale);
  const districts = units?.districts ?? serverDistricts;
  const samithis = units?.samithis ?? serverSamithis;
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const current: Filters = { district: state.district, sevaType: state.sevaType, samithi: state.samithi, volunteers: state.volunteers };
  const [draft, setDraft] = useState<Filters>(current);
  const count = activeFilterCount(current);

  const go = (f: Filters) => {
    // A new filter starts again from the first page and drops the selected day.
    const next: CalendarState = { ...state, ...f, page: 1, day: null };
    startTransition(() => router.push({ pathname: "/calendar", query: calendarQuery(next, today) }, { scroll: false }));
  };

  const samithisFor = (district: string | null) => samithis.filter((s) => !district || s.district === district);
  const label = (list: Option[], v: string | null) => list.find((o) => o.value === v)?.label ?? v ?? "";

  const selects = (
    <>
      <Select
        name="district"
        label={t("filterDistrict")}
        value={current.district ?? ""}
        options={[{ value: "", label: t("all") }, ...districts]}
        onChange={(e) => {
          const district = e.target.value || null;
          const keepSamithi = current.samithi && samithisFor(district).some((s) => s.value === current.samithi);
          go({ ...current, district, samithi: keepSamithi ? current.samithi : null });
        }}
      />
      <Select
        name="sevaType"
        label={t("filterSeva")}
        value={current.sevaType ?? ""}
        options={[{ value: "", label: t("all") }, ...sevaTypes]}
        onChange={(e) => go({ ...current, sevaType: (e.target.value || null) as SevaType | null })}
      />
      <Select
        name="samithi"
        label={t("filterSamithi")}
        value={current.samithi ?? ""}
        options={[{ value: "", label: t("all") }, ...samithisFor(current.district)]}
        onChange={(e) => go({ ...current, samithi: e.target.value || null })}
      />
    </>
  );

  const volunteersToggle = hydrated ? (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={current.volunteers}
      onClick={() => go({ ...current, volunteers: !current.volunteers })}
    >
      {current.volunteers ? <Icon name="check" size={16} /> : <Icon name="hand-heart" size={16} />}
      {t("filterVolunteers")}
    </button>
  ) : (
    <label className={styles.chip}>
      <input type="checkbox" name="volunteers" value="1" defaultChecked={current.volunteers} />
      {t("filterVolunteers")}
    </label>
  );

  const filterForm = (className?: string) => (
    <form method="get" className={cx(styles.filterForm, className)} role="search" aria-label={t("filtersLabel")}>
      {state.view === "month" ? (
        <>
          <input type="hidden" name="view" value="month" />
          <input type="hidden" name="month" value={state.month} />
        </>
      ) : null}
      {selects}
      {volunteersToggle}
      {hydrated ? null : (
        <button type="submit" className={styles.chip}>
          {t("apply")}
        </button>
      )}
    </form>
  );

  const removable: { key: keyof Filters; text: string }[] = [
    current.district ? { key: "district" as const, text: label(districts, current.district) } : null,
    current.sevaType ? { key: "sevaType" as const, text: label(sevaTypes, current.sevaType) } : null,
    current.samithi ? { key: "samithi" as const, text: label(samithis, current.samithi) } : null,
    current.volunteers ? { key: "volunteers" as const, text: t("filterVolunteers") } : null,
  ].filter((x): x is { key: keyof Filters; text: string } => x !== null);

  return (
    <div className={styles.filters} aria-busy={pending || undefined}>
      {/* Desktop: inline selects. Before hydration (or without JavaScript) they are a plain GET form. */}
      {filterForm(styles.desktopOnly)}
      {hydrated ? null : (
        <details className={cx(styles.phoneOnly, styles.noJsFilters)}>
          <summary>
            <Icon name="sliders-horizontal" size={16} />
            {count ? t("filtersCount", { count }) : t("filters")}
          </summary>
          {filterForm()}
        </details>
      )}

      {hydrated ? (
        <div className={styles.phoneOnly}>
          <Button
            variant="outline"
            size="sm"
            icon="sliders-horizontal"
            onClick={() => {
              setDraft(current);
              setOpen(true);
            }}
            aria-haspopup="dialog"
          >
            {count ? t("filtersCount", { count }) : t("filters")}
          </Button>
          <SideSheet
            open={open}
            onClose={() => setOpen(false)}
            side="bottom"
            title={t("filters")}
            footer={
              <div className={styles.sheetFoot}>
                <Button variant="ghost" onClick={() => setDraft({ district: null, sevaType: null, samithi: null, volunteers: false })}>
                  {t("clearAll")}
                </Button>
                <Button
                  onClick={() => {
                    setOpen(false);
                    go(draft);
                  }}
                >
                  {t("showResults")}
                </Button>
              </div>
            }
          >
            <div className={styles.sheetBody}>
              <ChipGroup
                legend={t("filterDistrict")}
                options={districts}
                value={draft.district}
                onChange={(district) =>
                  setDraft((d) => ({
                    ...d,
                    district,
                    samithi: d.samithi && samithisFor(district).some((s) => s.value === d.samithi) ? d.samithi : null,
                  }))
                }
              />
              <ChipGroup
                legend={t("filterSeva")}
                options={sevaTypes}
                value={draft.sevaType}
                onChange={(v) => setDraft((d) => ({ ...d, sevaType: v as SevaType | null }))}
              />
              <Select
                label={t("filterSamithi")}
                value={draft.samithi ?? ""}
                options={[{ value: "", label: t("all") }, ...samithisFor(draft.district)]}
                onChange={(e) => setDraft((d) => ({ ...d, samithi: e.target.value || null }))}
              />
              <fieldset className={styles.fieldset}>
                <legend>{t("showOnly")}</legend>
                <div className={styles.chips}>
                  <button
                    type="button"
                    className={styles.chip}
                    aria-pressed={draft.volunteers}
                    onClick={() => setDraft((d) => ({ ...d, volunteers: !d.volunteers }))}
                  >
                    {draft.volunteers ? <Icon name="check" size={16} /> : null}
                    {t("filterVolunteers")}
                  </button>
                </div>
              </fieldset>
            </div>
          </SideSheet>
        </div>
      ) : null}

      {hydrated && removable.length ? (
        <ul className={cx(styles.chips, styles.phoneOnly)} aria-label={t("activeFilters")}>
          {removable.map((r) => (
            <li key={r.key} className={styles.chipRm}>
              {r.text}
              <button
                type="button"
                aria-label={t("removeFilter", { filter: r.text })}
                onClick={() => go({ ...current, [r.key]: r.key === "volunteers" ? false : null })}
              >
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ChipGroup({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Option[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <fieldset className={styles.fieldset}>
      <legend>{legend}</legend>
      <div className={styles.chips}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={styles.chip}
            aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? null : o.value)}
          >
            {value === o.value ? <Icon name="check" size={16} /> : null}
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
