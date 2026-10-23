"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { type FormDefinition, type FormField, type FormSection, PALETTE_KINDS } from "@/contract";
import { type AppLocale } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Icon, type IconName } from "@/ui/Icon";
import { cx } from "@/ui/cx";
import { ArrowDown, ArrowUp, GripVertical, Lock, Trash2 } from "../icons";
import { CHILD_KINDS, type Kind } from "./builder-model";
import s from "./Builder.module.css";

export type Selection = { kind: "field"; id: string } | { kind: "section"; id: string } | null;

export const KIND_ICON: Record<string, IconName> = {
  number: "hash",
  text: "file-pen-line",
  date: "calendar-days",
  time: "clock",
  select: "list",
  multiselect: "list",
  yesno: "circle-check",
  repeater: "repeat",
  file: "paperclip",
  heading: "flag",
  help: "info",
};

export function Palette({ onAdd, targetLabel, disabled }: { onAdd: (k: Kind) => void; targetLabel: string; disabled: boolean }) {
  const t = useTranslations("admin.builder");
  return (
    <aside className={s.palette} aria-label={t("palette")}>
      <h2 className={s.palH}>{t("palette")}</h2>
      {PALETTE_KINDS.map((k) => (
        <button key={k} type="button" className={s.palBtn} disabled={disabled} onClick={() => onAdd(k)}>
          <Icon name={KIND_ICON[k]} size={18} />
          {t(`kind.${k}`)}
        </button>
      ))}
      <p className={s.palTarget}>{t("addsTo", { section: targetLabel })}</p>
    </aside>
  );
}

function SortableList({ ids, onMove, children, disabled }: { ids: string[]; onMove: (from: number, to: number) => void; children: ReactNode; disabled?: boolean }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onMove(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  };
  if (disabled) return <ul className={s.fields}>{children}</ul>;
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={s.fields}>{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

function FieldCard({
  f,
  selected,
  hiMissing,
  onSelect,
  onRemove,
  readOnly,
  errored,
  children,
}: {
  f: FormField;
  selected: boolean;
  hiMissing: boolean;
  onSelect: () => void;
  onRemove: () => void;
  readOnly: boolean;
  errored: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations("admin.builder");
  const locale = useLocale() as AppLocale;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: f.id, disabled: readOnly });
  const label = (locale === "hi" && f.label.hi) || f.label.en;
  return (
    <li ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined, transition, opacity: isDragging ? 0.6 : 1 }}>
      <div className={cx(s.fcard, selected && s.fcardSel, errored && s.fcardErr)}>
        <button type="button" className={s.drag} aria-label={t("dragField", { name: label || t("untitled") })} disabled={readOnly} {...attributes} {...listeners}>
          <Icon icon={GripVertical} size={18} />
        </button>
        <button type="button" className={s.fbody} onClick={onSelect} aria-pressed={selected} aria-label={t("selectField", { name: label || t("untitled") })}>
          <span className={s.fname}>
            <Icon name={KIND_ICON[f.kind] ?? "file-text"} size={16} />
            {label || <em>{t("untitled")}</em>}
            {f.locked ? <Icon icon={Lock} size={16} label={t("locked")} /> : null}
          </span>
          <span className={s.fmeta}>
            <span className={s.tag}>{t(`kind.${f.kind}`)}</span>
            {f.required ? <span className={s.tag}>{t("required")}</span> : null}
            {f.kpi ? <span className={cx(s.tag, s.tagBlue)}>{t("kpiTag", { key: f.kpi })}</span> : null}
            {f.personal ? (
              <span className={cx(s.tag, s.tagPink)}>
                <Icon icon={Lock} size={16} />
                {t("personalTag")}
              </span>
            ) : null}
            {f.showIf ? <span className={s.tag}>{t("conditional")}</span> : null}
            {hiMissing ? <span className={cx(s.tag, s.tagWarn)}>{t("hiMissing")}</span> : null}
          </span>
        </button>
        {!f.locked && !readOnly ? (
          <button type="button" className={s.ib} aria-label={t("removeField", { name: label || t("untitled") })} onClick={onRemove}>
            <Icon icon={Trash2} size={18} />
          </button>
        ) : null}
      </div>
      {children}
    </li>
  );
}

export function Canvas({
  def,
  selection,
  onSelect,
  onReorder,
  onRemove,
  onAddChild,
  onMoveSection,
  onAddSection,
  onSectionTarget,
  targetSectionId,
  hiMissing,
  errorIds,
  readOnly,
}: {
  def: FormDefinition;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onReorder: (sectionId: string, from: number, to: number, parentId?: string) => void;
  onRemove: (f: FormField) => void;
  onAddChild: (sectionId: string, parent: FormField, kind: Kind) => void;
  onMoveSection: (from: number, to: number) => void;
  onAddSection: () => void;
  onSectionTarget: (id: string) => void;
  targetSectionId: string;
  hiMissing: ReadonlySet<string>;
  errorIds: ReadonlySet<string>;
  readOnly: boolean;
}) {
  const t = useTranslations("admin.builder");
  const locale = useLocale() as AppLocale;
  return (
    <div className={s.canvas}>
      {def.sections.map((sec: FormSection, si) => {
        const selected = selection?.kind === "section" && selection.id === sec.id;
        const title = (locale === "hi" && sec.title.hi) || sec.title.en;
        return (
          <section key={sec.id} className={cx(s.sec, selected && s.secSel)} aria-label={title || t("untitledSection")}>
            <header className={s.secHd}>
              <button type="button" className={s.secT} onClick={() => (onSelect({ kind: "section", id: sec.id }), onSectionTarget(sec.id))} aria-pressed={selected}>
                {title || <em>{t("untitledSection")}</em>}
              </button>
              {sec.personalData ? (
                <span className={cx(s.tag, s.tagPink)}>
                  <Icon icon={Lock} size={16} />
                  {t("personalSection")}
                </span>
              ) : null}
              {hiMissing.has(`section:${sec.id}`) ? <span className={cx(s.tag, s.tagWarn)}>{t("hiMissing")}</span> : null}
              {!readOnly ? (
                <>
                  <button type="button" className={s.ib} aria-label={t("sectionUp")} disabled={si === 0} onClick={() => onMoveSection(si, si - 1)}>
                    <Icon icon={ArrowUp} size={18} />
                  </button>
                  <button type="button" className={s.ib} aria-label={t("sectionDown")} disabled={si === def.sections.length - 1} onClick={() => onMoveSection(si, si + 1)}>
                    <Icon icon={ArrowDown} size={18} />
                  </button>
                </>
              ) : null}
            </header>
            <div className={s.secBd}>
              {sec.fields.length === 0 ? <p className={s.empty}>{t("emptySection")}</p> : null}
              <SortableList ids={sec.fields.map((f) => f.id)} onMove={(a, b) => onReorder(sec.id, a, b)} disabled={readOnly}>
                {sec.fields.map((f) => (
                  <FieldCard key={f.id} f={f} selected={selection?.kind === "field" && selection.id === f.id} hiMissing={hiMissing.has(f.id)} errored={errorIds.has(f.id)} readOnly={readOnly} onSelect={() => (onSelect({ kind: "field", id: f.id }), onSectionTarget(sec.id))} onRemove={() => onRemove(f)}>
                    {f.kind === "repeater" ? (
                      <div className={s.kids}>
                        <SortableList ids={(f.fields ?? []).map((c) => c.id)} onMove={(a, b) => onReorder(sec.id, a, b, f.id)} disabled={readOnly}>
                          {(f.fields ?? []).map((c) => (
                            <FieldCard key={c.id} f={c} selected={selection?.kind === "field" && selection.id === c.id} hiMissing={hiMissing.has(c.id)} errored={errorIds.has(c.id)} readOnly={readOnly} onSelect={() => onSelect({ kind: "field", id: c.id })} onRemove={() => onRemove(c)} />
                          ))}
                        </SortableList>
                        {!readOnly ? (
                          <label className={s.mono} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {t("addToGroup")}
                            <select
                                              value=""
                              aria-label={t("addToGroup")}
                              onChange={(e) => e.target.value && onAddChild(sec.id, f, e.target.value as Kind)}
                              style={{ minHeight: 36, borderRadius: 18, border: "1px solid var(--border-subtle)", padding: "0 10px", font: "inherit" }}
                            >
                              <option value="">{t("chooseKind")}</option>
                              {CHILD_KINDS.map((k) => (
                                <option key={k} value={k}>
                                  {t(`kind.${k}`)}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                  </FieldCard>
                ))}
              </SortableList>
              {sec.id === targetSectionId ? <span className={s.mono}>{t("addingHere")}</span> : null}
            </div>
          </section>
        );
      })}
      {!readOnly ? (
        <Button variant="outline" icon="plus" className={s.add} onClick={onAddSection}>
          {t("addSection")}
        </Button>
      ) : null}
    </div>
  );
}
