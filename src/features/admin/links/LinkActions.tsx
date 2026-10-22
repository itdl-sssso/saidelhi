"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type FormLink, adminEndpoints } from "@/contract";
import type { AppLocale } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { useToast } from "@/ui/Toast";
import { ConfirmDialog } from "../Dialogs";
import { Ban, CalendarPlus, QrCode } from "../icons";
import { RowMenu } from "../Menu";
import { fromLocalInput, toLocalInput } from "../time";
import { useAction } from "../useAction";
import styles from "../Admin.module.css";

type Dlg = null | "qr" | "extend" | "revoke";

/** Where a copied link points: the same origin the coordinator is on (the token stays in the clipboard, never on screen). */
function copyTarget(url: string): string {
  try {
    const u = new URL(url);
    return `${window.location.origin}${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

/** Copy · resend · QR · extend · revoke for one form link. Hidden controls follow the link state and `canManage`. */
export function LinkActions({ link, canManage, compact }: { link: Pick<FormLink, "id" | "url" | "state" | "purpose" | "sentTo" | "expiresAt">; canManage: boolean; compact?: boolean }) {
  const t = useTranslations("admin.links");
  const toast = useToast();
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [dlg, setDlg] = useState<Dlg>(null);
  const [until, setUntil] = useState("");
  const active = link.state === "active";
  const canResend = canManage && active && link.sentTo !== "qr";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyTarget(link.url));
      toast.show({ tone: "success", message: t("copied") });
    } catch {
      toast.show({ tone: "error", message: t("copyFailed") });
    }
  };

  const openExtend = () => {
    const base = Math.max(Date.now(), Date.parse(link.expiresAt));
    setUntil(toLocalInput(new Date(base + 7 * 86_400_000).toISOString()));
    setDlg("extend");
  };

  const resend = () => run(adminEndpoints.linkAction(link.id, "resend"), { body: { lang: locale } }, { key: "resend", success: t("resent") });

  return (
    <>
      <span className={styles.row} style={{ gap: 0, flexWrap: "nowrap" }}>
        {active ? (
          compact ? (
            <Button variant="ghost" size="sm" icon="copy" onClick={copy}>
              {t("copy")}
            </Button>
          ) : (
            <button type="button" className={styles.icbtn} aria-label={t("copy")} title={t("copy")} onClick={copy}>
              <Icon name="copy" size={18} />
            </button>
          )
        ) : null}
        {canResend ? (
          compact ? (
            <Button variant="ghost" size="sm" icon="send" pending={pending === "resend"} onClick={resend}>
              {t("resend")}
            </Button>
          ) : (
            <button type="button" className={styles.icbtn} aria-label={t("resend")} title={t("resend")} disabled={pending === "resend"} onClick={resend}>
              <Icon name="send" size={18} />
            </button>
          )
        ) : null}
        <RowMenu
          items={[
            { icon: QrCode, label: t("qr"), onClick: () => setDlg("qr"), hidden: link.state === "revoked" },
            { icon: CalendarPlus, label: t("extend"), onClick: openExtend, hidden: !canManage || link.state === "revoked" },
            "-",
            { icon: Ban, label: t("revoke"), onClick: () => setDlg("revoke"), danger: true, hidden: !canManage || !active },
          ]}
        />
      </span>

      <Dialog
        open={dlg === "qr"}
        onClose={() => setDlg(null)}
        title={t("qrTitle")}
        width={560}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setDlg(null)}>
              {t("close")}
            </Button>
            <Button href={adminEndpoints.linkQrPdf(link.id)} external icon="external-link">
              {t("openPdf")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <p className={styles.sub}>{t("qrBody")}</p>
          {dlg === "qr" ? <iframe title={t("qrTitle")} src={`${adminEndpoints.linkQrPdf(link.id)}#toolbar=0&navpanes=0`} style={{ width: "100%", height: 420, border: "1px solid var(--border-subtle)", borderRadius: 12 }} /> : null}
        </div>
      </Dialog>

      <Dialog
        open={dlg === "extend"}
        onClose={() => setDlg(null)}
        title={t("extendTitle")}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setDlg(null)}>
              {t("close")}
            </Button>
            <Button
              pending={pending === "extend"}
              onClick={async () => {
                if (!until) return;
                const res = await run(adminEndpoints.linkAction(link.id, "extend"), { body: { expiresAt: fromLocalInput(until) } }, { key: "extend", success: t("extended") });
                if (res.ok) setDlg(null);
              }}
            >
              {t("extendConfirm")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <p className={styles.sub}>{t("extendBody")}</p>
          <Input type="datetime-local" label={t("extendLabel")} value={until} onChange={(e) => setUntil(e.target.value)} />
        </div>
      </Dialog>

      <ConfirmDialog
        open={dlg === "revoke"}
        onClose={() => setDlg(null)}
        title={t("revokeTitle")}
        body={<p className={styles.sub}>{t("revokeBody")}</p>}
        confirmLabel={t("revokeConfirm")}
        danger
        pending={pending === "revoke"}
        onConfirm={async () => (await run(adminEndpoints.linkAction(link.id, "revoke"), { body: {} }, { key: "revoke", success: t("revoked") })).ok}
      />
    </>
  );
}
