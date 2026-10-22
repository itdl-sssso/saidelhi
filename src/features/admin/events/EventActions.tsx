"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { type BulkResendResult, type EventAction, adminEndpoints } from "@/contract";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { useToast } from "@/ui/Toast";
import { ConfirmDialog, ReasonDialog } from "../Dialogs";
import { Ban, CalendarPlus } from "../icons";
import { RowMenu } from "../Menu";
import { fromLocalInput } from "../time";
import { useAction } from "../useAction";
import styles from "../Admin.module.css";
import type { EventControls } from "./lifecycle";

type Dlg = null | "request-changes" | "cancel" | "postpone" | "reopen";

export function EventActions({
  id,
  version,
  controls,
  publicHref,
}: {
  id: string;
  version: number;
  controls: EventControls;
  publicHref: string | null;
}) {
  const t = useTranslations("admin.event");
  const toast = useToast();
  const { run, pending } = useAction();
  const [dlg, setDlg] = useState<Dlg>(null);
  const [when, setWhen] = useState("");

  const act = async (action: EventAction, extra: { reason?: string; postponedTo?: string | null } = {}, success?: string) => {
    const res = await run(adminEndpoints.eventAction(id, action), { body: { version, ...extra } }, { success, key: action });
    return res.ok;
  };

  const resendLinks = async () => {
    const res = await run<BulkResendResult>(adminEndpoints.bulkResendLinks(), { body: { eventIds: [id] } }, { key: "links" });
    if (res.ok) {
      const sent = res.data.results.reduce((n, r) => n + r.resent, 0);
      toast.show({ tone: sent ? "success" : "info", message: sent ? t("linksSent", { count: sent }) : t("linksNone") });
    }
  };

  const primary = controls.actions[0];
  const secondary = controls.actions.slice(1);

  return (
    <div className={styles.actions}>
      {primary === "submit" ? (
        <Button pending={pending === "submit"} icon="send" onClick={() => act("submit", {}, t("done.submit"))}>
          {t("act.submit")}
        </Button>
      ) : null}
      {primary === "approve-plan" ? (
        <Button pending={pending === "approve-plan"} icon="check" onClick={() => act("approve-plan", {}, t("done.approvePlan"))}>
          {t("act.approvePlan")}
        </Button>
      ) : null}
      {primary === "approve-report" ? (
        <Button pending={pending === "approve-report"} icon="check" onClick={() => act("approve-report", {}, t("done.approveReport"))}>
          {t("act.approveReport")}
        </Button>
      ) : null}
      {primary === "reopen" ? (
        <Button variant="outline" icon="undo-2" onClick={() => setDlg("reopen")}>
          {t("act.reopen")}
        </Button>
      ) : null}
      {!primary && controls.sendLinks ? (
        <Button pending={pending === "links"} icon="send" onClick={resendLinks}>
          {t("act.sendLinks")}
        </Button>
      ) : null}
      {secondary.includes("request-changes") ? (
        <Button variant="outline" onClick={() => setDlg("request-changes")}>
          {t("act.requestChanges")}
        </Button>
      ) : null}
      <RowMenu
        label={t("moreActions")}
        items={[
          { icon: "pencil", label: t("act.edit"), href: `/admin/events/${id}/edit`, hidden: !controls.edit },
          { icon: "send", label: t("act.sendLinks"), onClick: resendLinks, hidden: !controls.sendLinks || !primary },
          { icon: CalendarPlus, label: t("act.postpone"), onClick: () => setDlg("postpone"), hidden: !controls.postpone },
          { icon: "external-link", label: t("act.viewPublic"), href: publicHref ?? "/", hidden: !publicHref },
          "-",
          { icon: Ban, label: t("act.cancel"), onClick: () => setDlg("cancel"), danger: true, hidden: !controls.cancel },
        ]}
      />

      <ReasonDialog
        open={dlg === "request-changes"}
        onClose={() => setDlg(null)}
        title={t("rc.title")}
        body={<p className={styles.sub}>{t("rc.body")}</p>}
        label={t("rc.label")}
        confirmLabel={t("rc.confirm")}
        required
        pending={pending === "request-changes"}
        onSubmit={(reason) => act("request-changes", { reason }, t("done.requestChanges"))}
      />
      <ReasonDialog
        open={dlg === "cancel"}
        onClose={() => setDlg(null)}
        title={t("cancelDlg.title")}
        body={<p className={styles.sub}>{t("cancelDlg.body")}</p>}
        label={t("cancelDlg.label")}
        confirmLabel={t("cancelDlg.confirm")}
        pending={pending === "cancel"}
        onSubmit={(reason) => act("cancel", reason ? { reason } : {}, t("done.cancel"))}
      />
      <Dialog
        open={dlg === "postpone"}
        onClose={() => setDlg(null)}
        title={t("postpone.title")}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setDlg(null)}>
              {t("close")}
            </Button>
            <Button
              pending={pending === "postpone"}
              onClick={async () => {
                if (await act("postpone", { postponedTo: when ? fromLocalInput(when) : null }, t("done.postpone"))) setDlg(null);
              }}
            >
              {t("postpone.confirm")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <p className={styles.sub}>{t("postpone.body")}</p>
          <Input type="datetime-local" label={t("postpone.label")} optional value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
      </Dialog>
      <ConfirmDialog
        open={dlg === "reopen"}
        onClose={() => setDlg(null)}
        title={t("reopenDlg.title")}
        body={<p className={styles.sub}>{t("reopenDlg.body")}</p>}
        confirmLabel={t("reopenDlg.confirm")}
        pending={pending === "reopen"}
        onConfirm={() => act("reopen", {}, t("done.reopen"))}
      />
    </div>
  );
}
