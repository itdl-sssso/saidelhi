"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { type OrgTreeNode, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { ConfirmDialog } from "../Dialogs";
import { GitMerge, UserX } from "../icons";
import { Panel, Pill } from "../kit";
import { RowMenu } from "../Menu";
import { useAction } from "../useAction";
import styles from "../Admin.module.css";
import o from "./Org.module.css";

type Dlg = null | "addSamithi" | "addDistrict" | "merge" | "deactivate";

function flatten(nodes: OrgTreeNode[], out = new Map<string, OrgTreeNode>()) {
  for (const n of nodes) {
    out.set(n.id, n);
    flatten(n.children, out);
  }
  return out;
}

const codePart = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 16);

export function OrgManager({ tree, canManage, isState, canAudit }: { tree: OrgTreeNode[]; canManage: boolean; isState: boolean; canAudit: boolean }) {
  const t = useTranslations("admin.org");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const byId = useMemo(() => flatten(tree), [tree]);
  const root = tree[0];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(() => new Set(tree.flatMap((r) => [r.id, ...(r.kind === "ncr" ? [] : [])])));
  const [q, setQ] = useState("");
  const [dlg, setDlg] = useState<Dlg>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const districts = [...byId.values()].filter((n) => n.kind === "district" && n.active);

  // Edit form state follows the selected node (reset while rendering when the node or its version changes).
  const initialForm = (n: OrgTreeNode | null) => ({ en: n?.name.en ?? "", hi: n?.name.hi ?? "", parent: n?.parentId ?? "" });
  const formKey = selected ? `${selected.id}:${selected.version}` : "";
  const [form, setForm] = useState(() => initialForm(selected));
  const [seenKey, setSeenKey] = useState(formKey);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (seenKey !== formKey) {
    setSeenKey(formKey);
    setForm(initialForm(selected));
    setErrors({});
  }
  const { en, hi, parent } = form;
  const setEn = (v: string) => setForm((f) => ({ ...f, en: v }));
  const setHi = (v: string) => setForm((f) => ({ ...f, hi: v }));
  const setParent = (v: string) => setForm((f) => ({ ...f, parent: v }));

  const select = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1100) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const needle = q.trim().toLowerCase();
  const matches = (n: OrgTreeNode): boolean => tx(n.name, locale).toLowerCase().includes(needle) || n.code.toLowerCase().includes(needle) || n.children.some(matches);

  const renderNode = (n: OrgTreeNode, depth: number) => {
    if (needle && !matches(n)) return null;
    const expanded = needle ? true : open.has(n.id);
    const hasKids = n.children.length > 0;
    const sub = n.kind === "samithi" ? n.code : t("counts", { samithis: n.counts.samithis, events: n.counts.events });
    return (
      <li key={n.id} role="none">
        <div className={styles.row} style={{ gap: 0, flexWrap: "nowrap" }}>
          {hasKids ? (
            <button type="button" className={o.chev} aria-label={expanded ? t("collapse") : t("expand")} aria-expanded={expanded} onClick={() => toggle(n.id)}>
              <Icon name={expanded ? "chevron-down" : "chevron-right"} size={16} />
            </button>
          ) : (
            <span className={o.chevSp} />
          )}
          <button
            type="button"
            role="treeitem"
            aria-selected={selectedId === n.id}
            aria-expanded={hasKids ? expanded : undefined}
            data-inactive={!n.active}
            className={`${o.row} ${depth === 0 ? o.depth0 : ""}`}
            onClick={() => select(n.id)}
          >
            <Icon name={n.kind === "ncr" ? "globe" : n.kind === "district" ? "map" : "house"} size={16} />
            <span className={o.name}>{tx(n.name, locale)}</span>
            {!n.active ? <Pill tone="slate">{n.mergedIntoId ? t("merged") : t("inactive")}</Pill> : <span className={o.cap}>{sub}</span>}
          </button>
        </div>
        {hasKids && expanded ? (
          <ul role="group" className={o.group} style={{ paddingLeft: 20 }}>
            {n.children.map((c) => renderNode(c, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  // ---- Edit / save
  const dirty = !!selected && (en.trim() !== selected.name.en || (hi.trim() || null) !== (selected.name.hi ?? null) || (parent && parent !== selected.parentId));
  const canEditThis = !!selected && canManage && selected.kind !== "ncr" && (isState || selected.kind === "samithi");
  const save = async () => {
    if (!selected) return;
    if (!en.trim()) return setErrors({ "name.en": t("errName") });
    const body: Record<string, unknown> = { name: { en: en.trim(), hi: hi.trim() || null }, version: selected.version };
    if (selected.kind === "samithi" && isState && parent && parent !== selected.parentId) body.parentId = parent;
    const res = await run(adminEndpoints.orgUnit(selected.id), { method: "PATCH", body }, { key: "save", success: t("saved"), quiet422: true });
    if (!res.ok && res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };

  // ---- Add
  const [addEn, setAddEn] = useState("");
  const [addHi, setAddHi] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addCodeTouched, setAddCodeTouched] = useState(false);
  const [addParent, setAddParent] = useState("");
  const [addErr, setAddErr] = useState<Record<string, string>>({});
  const parentDistrict = byId.get(addParent);
  const suggestedCode = dlg === "addDistrict" ? codePart(addEn) : parentDistrict ? `${parentDistrict.code}-${codePart(addEn.replace(/^samithi\s+/i, ""))}` : codePart(addEn);
  const shownCode = addCodeTouched ? addCode : addEn ? suggestedCode : "";

  const openAdd = (kind: "addSamithi" | "addDistrict") => {
    const district = selected?.kind === "district" ? selected : selected?.kind === "samithi" ? byId.get(selected.parentId ?? "") : districts[0];
    setAddEn("");
    setAddHi("");
    setAddCode("");
    setAddCodeTouched(false);
    setAddErr({});
    setAddParent(kind === "addDistrict" ? (root?.id ?? "") : (district?.id ?? ""));
    setDlg(kind);
  };
  const submitAdd = async () => {
    const kind = dlg === "addDistrict" ? "district" : "samithi";
    if (!addEn.trim()) return setAddErr({ "name.en": t("errName") });
    const res = await run<OrgTreeNode>(adminEndpoints.org(), { body: { kind, code: shownCode, name: { en: addEn.trim(), hi: addHi.trim() || null }, parentId: addParent } }, { key: "add", success: t("added"), quiet422: true });
    if (res.ok) {
      setDlg(null);
      setSelectedId(res.data.id);
      if (res.data.parentId) setOpen((s) => new Set(s).add(res.data.parentId as string));
    } else if (res.status === 422 || res.status === 409) setAddErr(res.error.fields ?? { form: res.error.message });
  };

  // ---- Merge / deactivate
  const [into, setInto] = useState("");
  const mergeTargets = selected ? [...byId.values()].filter((n) => n.kind === "samithi" && n.active && n.id !== selected.id) : [];

  const addDistrictAllowed = isState && !!root;
  const addSamithiAllowed = canManage && districts.length > 0;

  return (
    <div className={`${styles.grid} ${styles.gSplit}`}>
      <Panel
        title={root ? tx(root.name, locale) : t("title")}
        flush
        action={
          <label className={o.search}>
            <Icon name="search" size={16} />
            <input type="search" placeholder={t("find")} aria-label={t("find")} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        }
      >
        <ul role="tree" aria-label={t("treeLabel")} className={o.tree}>
          {tree.map((n) => renderNode(n, 0))}
        </ul>
        {canManage ? (
          <div className={styles.cardBd} style={{ borderTop: "1px solid var(--border-subtle)", flexDirection: "row", flexWrap: "wrap" }}>
            {addSamithiAllowed ? (
              <Button variant="outline" size="sm" icon="plus" onClick={() => openAdd("addSamithi")}>
                {t("addSamithi")}
              </Button>
            ) : null}
            {addDistrictAllowed ? (
              <Button variant="outline" size="sm" icon="plus" onClick={() => openAdd("addDistrict")}>
                {t("addDistrict")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Panel>

      <div ref={panelRef} style={{ minWidth: 0 }}>
        {selected ? (
          <Panel
            title={tx(selected.name, locale)}
            badge={selected.active ? <Pill tone="green" icon="circle-check">{t("active")}</Pill> : <Pill tone="slate">{selected.mergedIntoId ? t("merged") : t("inactive")}</Pill>}
            action={
              canEditThis && selected.active ? (
                <RowMenu
                  items={[
                    { icon: GitMerge, label: t("merge"), onClick: () => { setInto(""); setDlg("merge"); }, hidden: selected.kind !== "samithi" },
                    "-",
                    { icon: UserX, label: t("deactivate"), onClick: () => setDlg("deactivate"), danger: true },
                  ]}
                />
              ) : undefined
            }
          >
            <div className={`${styles.fieldGrid} ${styles.fieldGrid2}`}>
              <Input label={t("nameEn")} value={en} readOnly={!canEditThis} error={errors["name.en"]} onChange={(e) => setEn(e.target.value)} />
              <Input label={t("nameHi")} lang="hi" value={hi} readOnly={!canEditThis} onChange={(e) => setHi(e.target.value)} />
            </div>
            <div className={styles.col} style={{ gap: 6 }}>
              <span className={styles.strong}>{t("code")}</span>
              <span className={o.ro}>
                <span className={o.code}>{selected.code}</span>
                <Icon name="lock" size={16} />
              </span>
              <span className={styles.cap}>{t("codeHint")}</span>
            </div>
            {selected.kind === "samithi" ? (
              isState && canEditThis ? (
                <Select label={t("parent")} value={parent} error={errors.parentId} onChange={(e) => setParent(e.target.value)} options={districts.map((d) => ({ value: d.id, label: tx(d.name, locale) }))} />
              ) : (
                <Input label={t("parent")} readOnly value={byId.get(selected.parentId ?? "") ? tx((byId.get(selected.parentId ?? "") as OrgTreeNode).name, locale) : ""} />
              )
            ) : null}
            <dl className={styles.dl}>
              <dt>{t("people")}</dt>
              <dd>{selected.counts.people}</dd>
              <dt>{t("events")}</dt>
              <dd>{selected.counts.events}</dd>
              {selected.kind !== "samithi" ? (
                <>
                  <dt>{t("samithis")}</dt>
                  <dd>{selected.counts.samithis}</dd>
                </>
              ) : null}
            </dl>
            {errors.form ? <p className={styles.sub} style={{ color: "var(--signal-error-text)" }}>{errors.form}</p> : null}
            {canEditThis ? (
              <div className={`${styles.row} ${styles.rowEnd}`}>
                {canAudit ? (
                  <Link href={`/admin/audit?entity=org_unit&entityId=${selected.id}`} className={styles.textLink} style={{ marginRight: "auto" }}>
                    {t("history")}
                  </Link>
                ) : null}
                <Button variant="ghost" disabled={!dirty} onClick={() => setForm(initialForm(selected))}>
                  {t("discard")}
                </Button>
                <Button pending={pending === "save"} disabled={!dirty} onClick={save}>
                  {t("save")}
                </Button>
              </div>
            ) : null}
            {selected.kind === "samithi" && selected.mergedIntoId && byId.get(selected.mergedIntoId) ? (
              <p className={styles.sub}>{t("mergedInto", { name: tx((byId.get(selected.mergedIntoId) as OrgTreeNode).name, locale) })}</p>
            ) : null}
          </Panel>
        ) : (
          <div className={styles.card}>
            <div className={styles.cardBd}>
              <EmptyState icon="house" title={t("pickTitle")} body={t("pickBody")} />
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={dlg === "addSamithi" || dlg === "addDistrict"}
        onClose={() => setDlg(null)}
        title={dlg === "addDistrict" ? t("addDistrict") : t("addSamithi")}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setDlg(null)}>
              {t("cancel")}
            </Button>
            <Button pending={pending === "add"} onClick={submitAdd}>
              {t("create")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          {dlg === "addSamithi" ? (
            <Select label={t("parent")} value={addParent} error={addErr.parentId} onChange={(e) => setAddParent(e.target.value)} options={districts.map((d) => ({ value: d.id, label: tx(d.name, locale) }))} />
          ) : null}
          <Input label={t("nameEn")} value={addEn} error={addErr["name.en"]} onChange={(e) => setAddEn(e.target.value)} />
          <Input label={t("nameHi")} lang="hi" optional value={addHi} onChange={(e) => setAddHi(e.target.value)} />
          <Input label={t("code")} hint={t("codeNewHint")} value={shownCode} error={addErr.code} onChange={(e) => (setAddCode(e.target.value.toUpperCase()), setAddCodeTouched(true))} />
          {addErr.form ? <p className={styles.sub} style={{ color: "var(--signal-error-text)" }}>{addErr.form}</p> : null}
        </div>
      </Dialog>

      <Dialog
        open={dlg === "merge"}
        onClose={() => setDlg(null)}
        title={t("mergeTitle")}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setDlg(null)}>
              {t("cancel")}
            </Button>
            <Button
              pending={pending === "merge"}
              onClick={async () => {
                if (!selected || !into) return;
                const res = await run(adminEndpoints.orgAction(selected.id, "merge"), { body: { intoId: into, version: selected.version } }, { key: "merge", success: t("mergedDone") });
                if (res.ok) setDlg(null);
              }}
            >
              {t("mergeConfirm")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <p className={styles.sub}>{t("mergeBody", { name: selected ? tx(selected.name, locale) : "" })}</p>
          <Select label={t("mergeInto")} value={into} placeholder={t("choose")} onChange={(e) => setInto(e.target.value)} options={mergeTargets.map((n) => ({ value: n.id, label: tx(n.name, locale) }))} />
        </div>
      </Dialog>

      <ConfirmDialog
        open={dlg === "deactivate"}
        onClose={() => setDlg(null)}
        title={t("deactivateTitle")}
        body={<p className={styles.sub}>{t("deactivateBody", { name: selected ? tx(selected.name, locale) : "" })}</p>}
        confirmLabel={t("deactivateConfirm")}
        danger
        pending={pending === "deactivate"}
        onConfirm={async () => (selected ? (await run(adminEndpoints.orgAction(selected.id, "deactivate"), { body: { version: selected.version } }, { key: "deactivate", success: t("deactivated") })).ok : false)}
      />
    </div>
  );
}
