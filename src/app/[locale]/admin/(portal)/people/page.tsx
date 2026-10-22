import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { PeopleQuery, Role, UserStatus } from "@/contract";
import { FilterBar } from "@/features/admin/FilterBar";
import { Streamed } from "@/features/admin/Streamed";
import { NoAccess, PageHead } from "@/features/admin/kit";
import { PeopleManager, type ScopeUnit } from "@/features/admin/people/PeopleManager";
import { guarded, one, requirePortal, withParams } from "@/features/admin/server";
import { hrefWith } from "@/features/admin/url";
import { tx } from "@/lib/format";
import { Pagination } from "@/ui/Pagination";
import { services } from "@/server/services";
import styles from "@/features/admin/Admin.module.css";
import type { OrgTreeNode } from "@/contract";

export async function generateMetadata() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "admin.people" });
  return { title: t("title") };
}

function units(nodes: OrgTreeNode[], locale: "en" | "hi", depth = 0, out: ScopeUnit[] = []): ScopeUnit[] {
  for (const n of nodes) {
    if (n.active) {
      out.push({ id: n.id, label: tx(n.name, locale), kind: n.kind, depth });
      units(n.children, locale, depth + 1, out);
    }
  }
  return out;
}

async function Content({ searchParams }: PageProps<"/[locale]/admin/people">) {
  const sp = await searchParams;
  const { session, locale, allowed } = await requirePortal(withParams("/admin/people", sp), "people.read");
  if (!allowed) return <NoAccess />;
  const t = await getTranslations({ locale, namespace: "admin.people" });
  const tRole = await getTranslations({ locale, namespace: "admin.roles" });
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]));
  const parsed = PeopleQuery.safeParse(flat);
  const query = parsed.success ? parsed.data : PeopleQuery.parse({});
  const perms = session.actor.permissions;
  const [res, tree] = await Promise.all([
    guarded(() => services().portal.people.list(session.actor, query)),
    perms.has("org.read") ? services().portal.org.tree(session.actor) : Promise.resolve([]),
  ]);
  if (!res) return <NoAccess />;
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <FilterBar
        fields={[
          { kind: "search", key: "q", label: t("search") },
          { kind: "select", key: "role", label: t("fRole"), options: Role.options.map((r) => ({ value: r, label: tRole(r) })) },
          { kind: "select", key: "status", label: t("colStatus"), options: UserStatus.options.map((s) => ({ value: s, label: t(`status.${s}`) })) },
        ]}
      />
      <PeopleManager
        people={res.data}
        nowIso={new Date().toISOString()}
        meId={session.me.user.id}
        isState={session.actor.role === "state_admin"}
        canInvite={perms.has("people.invite")}
        canManage={perms.has("people.manage")}
        units={units(tree, locale)}
        reviewDue={res.meta.reviewDue}
      />
      {res.meta.total > query.pageSize ? <Pagination page={query.page} pageSize={query.pageSize} total={res.meta.total} href={(p) => hrefWith("/admin/people", sp, { page: p })} /> : null}
    </div>
  );
}

export default function Page(props: PageProps<"/[locale]/admin/people">) {
  return (
    <Streamed>
      <Content {...props} />
    </Streamed>
  );
}
