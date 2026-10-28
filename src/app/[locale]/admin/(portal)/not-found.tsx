import { useTranslations } from "next-intl";
import { PortalNotFound } from "@/features/admin/kit";

export default function NotFound() {
  const t = useTranslations("admin.notFound");
  return (
    <>
      <title>{t("title")}</title>
      <PortalNotFound />
    </>
  );
}
