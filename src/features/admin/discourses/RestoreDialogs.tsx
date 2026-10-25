"use client";

// Restore a paragraph (published version / imported AI draft) and discard-all dialogs (discourse editor, v0.9.2).
import { useTranslations } from "next-intl";
import type { AdminDiscourseBlock, AdminDiscourseDetail } from "@/contract";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import styles from "../Admin.module.css";
import d from "./Discourses.module.css";

type Source = "published" | "ai";

export function RestoreDialog({
  block,
  hi,
  pending,
  onClose,
  onRestore,
}: {
  block: AdminDiscourseBlock | null;
  hi: (b: AdminDiscourseBlock) => string;
  pending: boolean;
  onClose: () => void;
  onRestore: (blockId: string, source: Source) => void;
}) {
  const t = useTranslations("admin.discourses");
  const current = block ? hi(block) : "";
  const options: { source: Source; text: string }[] = [];
  if (block?.published && current !== (block.published.hi ?? "")) options.push({ source: "published", text: block.published.hi ?? "" });
  if (block?.aiDraft && current !== block.aiDraft) options.push({ source: "ai", text: block.aiDraft });
  return (
    <Dialog
      open={block !== null}
      onClose={onClose}
      title={block ? t("restoreTitle", { n: block.idx }) : ""}
      width={640}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <p className={styles.cap}>{t("restoreIntro")}</p>
        <div className={d.diffBox}>
          <span className={d.cellLabel}>{t("restoreCurrent")}</span>
          <p lang="hi" className={d.diffText}>
            {current || t("restoreEmpty")}
          </p>
        </div>
        {options.map((o) => (
          <div key={o.source} className={d.diffBox}>
            <span className={d.cellLabel}>{t(o.source === "published" ? "restorePublished" : "restoreAi")}</span>
            <p lang="hi" className={d.diffText}>
              {o.text || t("restoreEmpty")}
            </p>
            <Button size="sm" variant="secondary" icon="undo-2" disabled={pending} onClick={() => block && onRestore(block.id, o.source)}>
              {t(o.source === "published" ? "restorePublishedBtn" : "restoreAiBtn")}
            </Button>
          </div>
        ))}
        {options.length === 0 ? <p className={styles.cap}>{t("restoreNone")}</p> : null}
      </div>
    </Dialog>
  );
}

export function DiscardDialog({
  open,
  summary,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  summary: AdminDiscourseDetail["dirtySummary"];
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("admin.discourses");
  const items: string[] = [];
  if (summary.blocks) items.push(t("discardBlocks", { n: summary.blocks }));
  if (summary.quotes) items.push(t("discardQuotes"));
  if (summary.title) items.push(t("discardTitle"));
  if (summary.why) items.push(t("discardWhy"));
  if (summary.themes) items.push(t("discardThemes"));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("discardTitleDlg")}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon="undo-2" pending={pending} onClick={onConfirm}>
            {t("discardConfirm")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <p>{t("discardBody")}</p>
        <ul>
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}
