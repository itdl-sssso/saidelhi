import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { PrivacyPage } from "@/features/admin/privacy/PrivacyPage";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.privacy" });
  return { title: t("title") };
}

async function Content() {
  const { allowed, session } = await requirePortal("/admin/privacy", "privacy.read");
  // privacy.manage alone is also enough to open the page (nav `alsoFor`).
  if (!allowed && !session.actor.permissions.has("privacy.manage")) return <NoAccess />;
  return <PrivacyPage />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
