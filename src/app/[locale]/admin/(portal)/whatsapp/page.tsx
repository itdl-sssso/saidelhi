import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal, withParams } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";
import { WhatsAppAdmin } from "@/features/admin/whatsapp/WhatsAppAdmin";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.whatsapp" });
  return { title: t("title") };
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/whatsapp">) {
  const sp = await searchParams;
  // whatsapp.manage sees every tab; whatsapp.reminders (district coordinators) only the Reminders tab.
  const { session } = await requirePortal(withParams("/admin/whatsapp", sp));
  const perms = session.actor.permissions;
  const canManage = perms.has("whatsapp.manage");
  const canReminders = canManage || perms.has("whatsapp.reminders");
  if (!canReminders) return <NoAccess />;
  return <WhatsAppAdmin canManage={canManage} canReminders={canReminders} />;
}

export default function Page(props: PageProps<"/[locale]/admin/whatsapp">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
