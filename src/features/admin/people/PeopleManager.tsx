"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type Locale, type Person, type Role, Role as RoleEnum, adminEndpoints } from "@/contract";
import { type AppLocale, formatDate, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { ConfirmDialog } from "../Dialogs";
import { ShieldCheck, UserCog, UserX } from "../icons";
import { Pill } from "../kit";
import { RowMenu } from "../Menu";
import { useAction } from "../useAction";
import styles from "../Admin.module.css";

export interface ScopeUnit {
  id: string;
  label: string;
  kind: "ncr" | "district" | "samithi";
  depth: number;
}

const SCOPE_KIND: Record<Role, "ncr" | "district" | "samithi" | null> = {
  state_admin: "ncr",
  content_editor: "ncr",
  pii_officer: "ncr",
  translator: null,
  district_coord: "district",
  samithi_coord: "samithi",
};

const DAY = 86_400_000;
const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export function PeopleManager({
  people,
  nowIso,
  meId,
  isState,
  canInvite,
  canManage,
  units,
  reviewDue,
}: {
  people: Person[];
  nowIso: string;
  meId: string;
  isState: boolean;
  canInvite: boolean;
  canManage: boolean;
  units: ScopeUnit[];
  reviewDue: number;
}) {
  const t = useTranslations("admin.people");
  const tRole = useTranslations("admin.roles");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const nowMs = Date.parse(nowIso);
  const [dlg, setDlg] = useState<null | "invite" | "edit" | "deactivate">(null);
  const [target, setTarget] = useState<Person | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", digits: "", email: "", role: "samithi_coord" as Role, scopeId: "", locale: "en" as Locale });

  const roles: Role[] = isState ? RoleEnum.options : ["district_coord", "samithi_coord"];
  const scopesFor = (role: Role) => {
    const kind = SCOPE_KIND[role];
    return kind ? units.filter((u) => u.kind === kind) : [];
  };
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors({});
  };
  const setRole = (role: Role) => {
    const opts = scopesFor(role);
    setForm((f) => ({ ...f, role, scopeId: opts.some((o) => o.id === f.scopeId) ? f.scopeId : (opts.length === 1 || SCOPE_KIND[role] === "ncr" ? (opts[0]?.id ?? "") : "") }));
    setErrors({});
  };

  const openInvite = () => {
    const role: Role = isState ? "samithi_coord" : "samithi_coord";
    setForm({ name: "", digits: "", email: "", role, scopeId: "", locale: "en" });
    setErrors({});
    setDlg("invite");
  };
  const openEdit = (p: Person) => {
    setTarget(p);
    setForm({ name: p.name, digits: "", email: p.email ?? "", role: p.role, scopeId: p.scope?.id ?? "", locale: p.locale });
    setErrors({});
    setDlg("edit");
  };

  const needsScope = SCOPE_KIND[form.role] !== null;

  const invite = async () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("errName");
    if (!/^[6-9]\d{9}$/.test(form.digits)) e.phone = t("errPhone");
    if (needsScope && SCOPE_KIND[form.role] !== "ncr" && !form.scopeId) e.scopeId = t("errScope");
    setErrors(e);
    if (Object.keys(e).length) return;
    const res = await run(
      adminEndpoints.invite(),
      { body: { name: form.name.trim(), phone: `+91${form.digits}`, email: form.email.trim() || null, role: form.role, scopeId: needsScope ? form.scopeId || null : null, locale: form.locale } },
      { key: "invite", success: t("invited"), quiet422: true },
    );
    if (res.ok) setDlg(null);
    else if (res.status === 422 || res.status === 409) setErrors(res.error.fields ?? { form: res.error.message });
  };

  const save = async () => {
    if (!target) return;
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("errName");
    if (needsScope && SCOPE_KIND[form.role] !== "ncr" && !form.scopeId) e.scopeId = t("errScope");
    setErrors(e);
    if (Object.keys(e).length) return;
    const res = await run(
      adminEndpoints.person(target.id),
      { method: "PATCH", body: { name: form.name.trim(), email: form.email.trim() || null, locale: form.locale, role: form.role, scopeId: needsScope ? form.scopeId || null : null, version: target.version } },
      { key: "save", success: t("saved"), quiet422: true },
    );
    if (res.ok) setDlg(null);
    else if (res.status === 422 || res.status === 403) setErrors(res.error.fields ?? { form: res.error.message });
  };

  const statusPill = (p: Person) =>
    p.status === "active" ? (
      <Pill tone="green" icon="circle-check">
        {t("status.active")}
      </Pill>
    ) : p.status === "invited" ? (
      <Pill tone="blue" icon="send">
        {t("status.invited")}
      </Pill>
    ) : (
      <Pill tone="slate" icon="circle-x">
        {t("status.deactivated")}
      </Pill>
    );

  const stale = (p: Person) => p.status === "active" && (!p.lastSignInAt || nowMs - Date.parse(p.lastSignInAt) > 90 * DAY);
  const lastSeen = (p: Person) => (p.lastSignInAt ? formatDate(p.lastSignInAt, locale) : p.status === "invited" ? t("neverYet") : "—");

  const menu = (p: Person) =>
    canManage && p.id !== meId ? (
      <RowMenu
        items={[
          { icon: UserCog, label: t("editAccess"), onClick: () => openEdit(p), hidden: p.status === "deactivated" },
          "-",
          { icon: UserX, label: t("deactivate"), onClick: () => (setTarget(p), setDlg("deactivate")), danger: true, hidden: p.status === "deactivated" },
        ]}
      />
    ) : null;

  return (
    <>
      <div className={styles.row} style={{ justifyContent: "space-between" }}>
        <span />
        {canInvite ? (
          <Button icon="plus" onClick={openInvite}>
            {t("invite")}
          </Button>
        ) : null}
      </div>
      {reviewDue > 0 ? (
        <div className={`${styles.callout} ${styles.calloutBlue}`} role="status">
          <ShieldIcon />
          <span style={{ flex: 1, minWidth: 200 }}>
            <b className={styles.strong}>{t("reviewTitle", { count: reviewDue })}</b>
            <br />
            {t("reviewBody")}
          </span>
        </div>
      ) : null}

      <div className={styles.tblWrap}>
        {people.length === 0 ? (
          <div className={styles.cardBd}>
            <EmptyState icon="users" title={t("empty")} body={t("emptyBody")} />
          </div>
        ) : (
          <>
            <div className={`${styles.tblScroll} ${styles.onlyDesk}`}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">{t("colName")}</th>
                    <th scope="col">{t("colPhone")}</th>
                    <th scope="col">{t("colRole")}</th>
                    <th scope="col">{t("colScope")}</th>
                    <th scope="col">{t("colLast")}</th>
                    <th scope="col">{t("colStatus")}</th>
                    <th scope="col">
                      <span className={styles.srOnly}>{t("actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className={styles.row} style={{ gap: 10, flexWrap: "nowrap" }}>
                          <span className={styles.qaIc} style={{ width: 36, height: 36, background: "var(--blue-100)", color: "var(--blue-700)", fontSize: 13, fontWeight: 600 }}>
                            {initials(p.name)}
                          </span>
                          <span className={styles.tblT}>{p.name}</span>
                        </span>
                      </td>
                      <td className={`${styles.num} ${styles.nowrap}`}>{p.phone}</td>
                      <td>{tRole(p.role)}</td>
                      <td>{p.scope ? tx(p.scope.name, locale) : t("noScope")}</td>
                      <td className={styles.nowrap}>
                        <span style={stale(p) ? { color: "var(--pink-700)", fontWeight: 600 } : undefined}>{lastSeen(p)}</span>
                      </td>
                      <td>{statusPill(p)}</td>
                      <td>{menu(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`${styles.cards} ${styles.onlyPhone}`} style={{ padding: 12 }}>
              {people.map((p) => (
                <div className={styles.lcard} key={p.id}>
                  <div className={styles.row} style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
                    <span className={styles.row} style={{ gap: 10, flexWrap: "nowrap" }}>
                      <span className={styles.qaIc} style={{ width: 36, height: 36, background: "var(--blue-100)", color: "var(--blue-700)", fontSize: 13, fontWeight: 600 }}>
                        {initials(p.name)}
                      </span>
                      <span className={styles.col}>
                        <span className={styles.tblT}>{p.name}</span>
                        <span className={styles.cap}>{p.phone}</span>
                      </span>
                    </span>
                    {menu(p)}
                  </div>
                  <dl>
                    <dt>{t("colRole")}</dt>
                    <dd>{tRole(p.role)}</dd>
                    <dt>{t("colScope")}</dt>
                    <dd>{p.scope ? tx(p.scope.name, locale) : t("noScope")}</dd>
                    <dt>{t("colLast")}</dt>
                    <dd style={stale(p) ? { color: "var(--pink-700)", fontWeight: 600 } : undefined}>{lastSeen(p)}</dd>
                  </dl>
                  <div>{statusPill(p)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog
        open={dlg === "invite" || dlg === "edit"}
        onClose={() => setDlg(null)}
        title={dlg === "edit" ? t("editTitle") : t("inviteTitle")}
        width={520}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setDlg(null)}>
              {t("cancel")}
            </Button>
            <Button pending={pending === "invite" || pending === "save"} icon={dlg === "invite" ? "send" : undefined} onClick={dlg === "edit" ? save : invite}>
              {dlg === "edit" ? t("saveChanges") : t("sendInvite")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
          <div className={`${styles.fieldGrid} ${styles.fieldGrid2}`}>
            <Input label={t("fName")} value={form.name} error={errors.name} onChange={(e) => set("name", e.target.value)} />
            {dlg === "invite" ? (
              <Input label={t("fPhone")} inputMode="numeric" autoComplete="off" maxLength={12} value={form.digits} error={errors.phone} hint={t("fPhoneHint")} onChange={(e) => set("digits", e.target.value.replace(/\D/g, "").slice(-10))} />
            ) : (
              <Input label={t("fPhone")} value={target?.phone ?? ""} readOnly />
            )}
          </div>
          <Input type="email" label={t("fEmail")} optional value={form.email} error={errors.email} onChange={(e) => set("email", e.target.value)} />
          <div className={`${styles.fieldGrid} ${styles.fieldGrid2}`}>
            <Select label={t("fRole")} value={form.role} error={errors.role} onChange={(e) => setRole(e.target.value as Role)} options={roles.map((r) => ({ value: r, label: tRole(r) }))} />
            <Select
              label={t("fLanguage")}
              value={form.locale}
              onChange={(e) => set("locale", e.target.value as Locale)}
              options={[
                { value: "en", label: "English" },
                { value: "hi", label: "हिंदी" },
              ]}
            />
          </div>
          {needsScope && SCOPE_KIND[form.role] !== "ncr" ? (
            <Select
              label={t("fScope")}
              hint={isState ? undefined : t("scopeHint")}
              value={form.scopeId}
              error={errors.scopeId}
              placeholder={t("choose")}
              onChange={(e) => set("scopeId", e.target.value)}
              options={scopesFor(form.role).map((u) => ({ value: u.id, label: u.label }))}
            />
          ) : (
            <p className={styles.cap}>{needsScope ? t("scopeNcr") : t("scopeNone")}</p>
          )}
          {dlg === "invite" ? <p className={styles.cap}>{t("inviteNote")}</p> : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={dlg === "deactivate"}
        onClose={() => setDlg(null)}
        title={t("deactivateTitle")}
        body={<p className={styles.sub}>{t("deactivateBody", { name: target?.name ?? "" })}</p>}
        confirmLabel={t("deactivateConfirm")}
        danger
        pending={pending === "deactivate"}
        onConfirm={async () => (target ? (await run(adminEndpoints.deactivatePerson(target.id), { body: { version: target.version } }, { key: "deactivate", success: t("deactivated") })).ok : false)}
      />
    </>
  );
}

function ShieldIcon() {
  return <ShieldCheck width={20} height={20} strokeWidth={1.75} aria-hidden="true" style={{ flex: "none", color: "var(--blue-700)" }} />;
}
