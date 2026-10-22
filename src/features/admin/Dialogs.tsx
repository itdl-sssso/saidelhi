"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Textarea } from "@/ui/Input";
import styles from "./Admin.module.css";

/** Confirmation with a single decision. `onConfirm` resolves true on success (the dialog then closes). */
export function ConfirmDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  danger,
  pending,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => Promise<boolean | void> | boolean | void;
}) {
  const t = useTranslations("admin.common");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant={danger ? "outline" : "primary"}
            pending={pending}
            onClick={async () => {
              if ((await onConfirm()) !== false) onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {body ? <div className={styles.dialogBody}>{body}</div> : null}
    </Dialog>
  );
}

/** Asks for a reason (required or optional) before a decision such as "request changes" or "cancel". */
export function ReasonDialog({
  open,
  onClose,
  title,
  body,
  label,
  confirmLabel,
  required,
  pending,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  body?: ReactNode;
  label: string;
  confirmLabel: string;
  required?: boolean;
  pending?: boolean;
  onSubmit: (reason: string) => Promise<boolean | void>;
}) {
  const t = useTranslations("admin.common");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setReason("");
    setError(null);
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={close}>
            {t("cancel")}
          </Button>
          <Button
            pending={pending}
            onClick={async () => {
              const r = reason.trim();
              if (required && !r) return setError(t("reasonRequired"));
              if ((await onSubmit(r)) !== false) close();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        {body}
        <Textarea
          label={label}
          optional={!required}
          rows={4}
          maxLength={1000}
          value={reason}
          error={error ?? undefined}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
        />
      </div>
    </Dialog>
  );
}
