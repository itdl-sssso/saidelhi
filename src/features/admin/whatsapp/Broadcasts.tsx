"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type BroadcastBody, type BroadcastResult, type OrgUnit, SevaType, adminEndpoints, endpoints } from "@/contract";
import { type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Textarea } from "@/ui/Input";
import { MultiSelect } from "@/ui/MultiSelect";
import { ConfirmDialog } from "../Dialogs";
import { Panel } from "../kit";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import styles from "../Admin.module.css";
import s from "./WhatsApp.module.css";

const SEVA = SevaType.options;

export function Broadcasts() {
  const t = useTranslations("admin.whatsapp.broadcasts");
  const tSeva = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const districts = useApi<OrgUnit[]>(endpoints.orgUnits({ kind: "district" }));
  const [districtIds, setDistrictIds] = useState<string[]>([]);
  const [sevaTypes, setSevaTypes] = useState<string[]>([]);
  const [en, setEn] = useState("");
  const [hi, setHi] = useState("");
  const [estimate, setEstimate] = useState<{ key: string; res: BroadcastResult } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [enError, setEnError] = useState<string | null>(null);
  const [sentMsg, setSentMsg] = useState<number | null>(null);

  const body = (dryRun: boolean): BroadcastBody => ({
    districtIds,
    sevaTypes: sevaTypes as BroadcastBody["sevaTypes"],
    text: { en: en.trim(), hi: hi.trim() || null },
    dryRun,
  });
  // The estimate belongs to exactly these inputs; any change turns the send button off again.
  const key = JSON.stringify(body(true));
  const fresh = estimate?.key === key ? estimate.res : null;
  const nf = new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN");

  const reset = () => setSentMsg(null);

  const doEstimate = async () => {
    if (!en.trim()) return setEnError(t("textRequired"));
    reset();
    const res = await run<BroadcastResult>(adminEndpoints.waBroadcasts(), { body: body(true) }, { key: "estimate", refresh: false });
    if (res.ok) setEstimate({ key, res: res.data });
  };

  const send = async () => {
    const res = await run<BroadcastResult>(adminEndpoints.waBroadcasts(), { body: body(false) }, { key: "send", refresh: false });
    if (!res.ok) return false;
    setSentMsg(res.data.recipients);
    setEstimate(null);
    setEn("");
    setHi("");
  };

  const options = (districts.data ?? []).map((d) => ({ value: d.id, label: tx(d.name, locale) }));

  return (
    <div className={`${styles.grid} ${styles.gMain}`}>
      <Panel title={t("title")}>
        <Alert tone="note">
          <Icon name="shield-check" size={16} /> {t("optInNote")}
        </Alert>
        <MultiSelect id="bc-districts" label={t("districts")} help={t("districtsHelp")} options={options} value={districtIds} onChange={(v) => { setDistrictIds(v); reset(); }} optional />
        <MultiSelect id="bc-seva" label={t("seva")} help={t("sevaHelp")} options={SEVA.map((v) => ({ value: v, label: tSeva(v) }))} value={sevaTypes} onChange={(v) => { setSevaTypes(v); reset(); }} optional />
        <Textarea
          label={t("textEn")}
          rows={4}
          maxLength={1000}
          value={en}
          error={enError ?? undefined}
          onChange={(e) => {
            setEn(e.target.value);
            setEnError(null);
          }}
        />
        <Textarea label={t("textHi")} optional rows={4} maxLength={1000} lang="hi" value={hi} hint={t("textHiHelp")} onChange={(e) => setHi(e.target.value)} />

        {fresh ? (
          <div className={s.cost} role="status">
            <Icon name="info" size={20} />
            <span className={s.costBody}>
              <b className={s.costBig}>{t("estimate", { n: fresh.recipients, cost: nf.format(Math.round(fresh.estimatedCostInr)) })}</b>
              <span className={styles.cap}>{fresh.recipients === 0 ? t("estimateNone") : t("estimateNote")}</span>
            </span>
          </div>
        ) : (
          <p className={styles.cap}>{t("estimateFirst")}</p>
        )}
        {sentMsg !== null ? (
          <Alert tone="success" title={t("sentTitle")}>
            {t("sentBody", { n: sentMsg })}
          </Alert>
        ) : null}
        <div className={`${styles.row} ${styles.rowEnd}`}>
          <Button variant="outline" icon="search" pending={pending === "estimate"} onClick={doEstimate}>
            {t("estimateBtn")}
          </Button>
          <Button icon="send" disabled={!fresh || fresh.recipients === 0} onClick={() => setConfirm(true)}>
            {fresh ? t("sendN", { n: fresh.recipients }) : t("send")}
          </Button>
        </div>
      </Panel>

      <Panel title={t("preview")}>
        <div className={s.preview}>
          <span className={s.tmpl}>
            <Icon name="badge-check" size={16} />
            {t("previewBadge")}
          </span>
          <div className={s.pbub}>{en.trim() || <span className={s.muted}>{t("previewEmpty")}</span>}</div>
          {hi.trim() ? (
            <div className={s.pbub} lang="hi">
              {hi}
            </div>
          ) : null}
        </div>
      </Panel>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t("confirmTitle", { n: fresh?.recipients ?? 0 })}
        body={<p>{t("confirmBody", { n: fresh?.recipients ?? 0, cost: nf.format(Math.round(fresh?.estimatedCostInr ?? 0)) })}</p>}
        confirmLabel={t("confirmSend", { n: fresh?.recipients ?? 0 })}
        pending={pending === "send"}
        onConfirm={send}
      />
    </div>
  );
}
