import { useTranslations } from "next-intl";
import { ErrorView } from "@/features/errors/ErrorView";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <>
      <title>{t("notFoundTitle")}</title>
      <ErrorView kind="notFound" />
    </>
  );
}
