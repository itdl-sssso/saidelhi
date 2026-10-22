"use client";

import { useTranslations } from "next-intl";
import { type BulkResendResult, adminEndpoints } from "@/contract";
import { Button, type ButtonVariant } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import { useAction } from "../useAction";

/** Resends the report links of the given events on WhatsApp (POST /admin/events/bulk/resend-links). */
export function ResendButton({
  eventIds,
  label,
  variant = "ghost",
  size = "sm",
  onDone,
}: {
  eventIds: string[];
  label?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  onDone?: () => void;
}) {
  const t = useTranslations("admin.events");
  const toast = useToast();
  const { run, pending } = useAction();
  return (
    <Button
      variant={variant}
      size={size}
      icon="send"
      pending={pending !== null}
      onClick={async () => {
        const res = await run<BulkResendResult>(adminEndpoints.bulkResendLinks(), { body: { eventIds } });
        if (!res.ok) return;
        const sent = res.data.results.reduce((n, r) => n + r.resent, 0);
        toast.show({ tone: sent > 0 ? "success" : "info", message: sent > 0 ? t("resent", { count: sent }) : t("resentNone") });
        onDone?.();
      }}
    >
      {label ?? t("resendLink")}
    </Button>
  );
}
