import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { InboxItem } from "@/features/admin/inbox/InboxItem";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.inbox" });
  return { title: t("itemMeta") };
}

async function Content({ params }: PageProps<"/[locale]/admin/inbox/[id]">) {
  const { id } = await params;
  const { allowed } = await requirePortal(`/admin/inbox/${id}`, "inbox.review");
  if (!allowed) return <NoAccess />;
  return <InboxItem id={id} />;
}

export default function Page(props: PageProps<"/[locale]/admin/inbox/[id]">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
