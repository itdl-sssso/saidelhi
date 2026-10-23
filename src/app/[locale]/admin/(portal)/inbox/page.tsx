import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { InboxList } from "@/features/admin/inbox/InboxList";
import { NoAccess } from "@/features/admin/kit";
import { requirePortal, withParams } from "@/features/admin/server";
import { Streamed } from "@/features/admin/Streamed";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.inbox" });
  return { title: t("title") };
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/inbox">) {
  const sp = await searchParams;
  const { allowed } = await requirePortal(withParams("/admin/inbox", sp), "inbox.review");
  if (!allowed) return <NoAccess />;
  return <InboxList />;
}

export default function Page(props: PageProps<"/[locale]/admin/inbox">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
