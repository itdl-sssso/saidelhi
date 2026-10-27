import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess } from "@/features/admin/kit";
import { PlanPage } from "@/features/admin/events/PlanPage";
import { one, requirePortal } from "@/features/admin/server";
import type { Actor } from "@/server/auth/rbac";
import { services } from "@/server/services";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.form" });
  return { title: t("newTitle") };
}

/** `?from=<inboxId>`: prefill from that inbox item's message (skipped if it is out of scope or has no text). */
async function prefillFrom(actor: Actor, inboxId: string | undefined) {
  if (!inboxId) return null;
  try {
    const s = services();
    const text = (await s.wa.inbox.get(actor, inboxId)).raw.text;
    return text?.trim() ? await s.portal.events.fromMessage(actor, text) : null;
  } catch {
    return null;
  }
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/events/new">) {
  const from = one((await searchParams).from);
  const { session, locale, allowed } = await requirePortal(from ? `/admin/events/new?from=${encodeURIComponent(from)}` : "/admin/events/new", "events.plan");
  if (!allowed) return <NoAccess />;
  return <PlanPage session={session} locale={locale} prefill={await prefillFrom(session.actor, from)} />;
}

export default function Page(props: PageProps<"/[locale]/admin/events/new">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
