import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { FollowUpPage } from "@/features/admin/followup/FollowUpPage";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.followup" });
  return { title: t("title") };
}

async function Content() {
  const { allowed, session } = await requirePortal("/admin/follow-up", "followup.read");
  if (!allowed) return <NoAccess />;
  return <FollowUpPage canReveal={session.actor.permissions.has("followup.reveal")} />;
}

export default function Page() {
  return (
    <Streamed>
      <Content />
    </Streamed>
  );
}
