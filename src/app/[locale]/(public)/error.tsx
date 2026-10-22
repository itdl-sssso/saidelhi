"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorView } from "@/features/errors/ErrorView";
import { Button } from "@/ui/Button";

function digestOf(error: unknown): string | undefined {
  return error && typeof error === "object" && "digest" in error && typeof error.digest === "string"
    ? error.digest
    : undefined;
}

export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorView
      kind="error"
      digest={digestOf(error)}
      actions={
        <Button icon="repeat" onClick={retry}>
          {t("tryAgain")}
        </Button>
      }
    />
  );
}
