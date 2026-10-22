import { getTranslations } from "next-intl/server";
import type { EventAdmin } from "@/contract";
import type { AppLocale } from "@/lib/format";
import type { PortalSession } from "@/server/auth/session";
import { PageHead } from "../kit";
import { orgOptions } from "../server";
import { EventForm } from "./EventForm";
import styles from "../Admin.module.css";

/** Plan / edit event page body (spec 27): samithis come from the viewer's scope. */
export async function PlanPage({ session, locale, event }: { session: PortalSession; locale: AppLocale; event?: EventAdmin }) {
  const t = await getTranslations({ locale, namespace: "admin.form" });
  const org = await orgOptions(session, locale);
  const districtName = new Map(org.districts.map((d) => [d.value, d.label]));
  const samithis = org.samithis.map((s) => ({ value: s.value, label: s.label, districtLabel: org.districts.length > 1 ? districtName.get(s.districtId) : undefined }));
  const own = session.me.scope?.kind === "samithi" ? session.me.scope.id : (samithis[0]?.value ?? "");
  return (
    <div className={styles.page}>
      <PageHead
        back={{ href: event ? `/admin/events/${event.id}` : "/admin/events", label: event ? t("backEvent") : t("backEvents") }}
        title={event ? t("editTitle") : t("newTitle")}
        sub={event ? t("editSub") : t("newSub")}
      />
      <EventForm event={event} samithis={samithis} defaultSamithi={own} />
    </div>
  );
}
