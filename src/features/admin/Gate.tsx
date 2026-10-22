// Portal chrome for signed-in coordinators. Signed-out visitors get the bare children: every page
// calls requirePortal(), which redirects them to /admin/login?next=…
import { connection } from "next/server";
import type { ReactNode } from "react";
import type { OrgTreeNode } from "@/contract";
import { getSession } from "@/server/auth/session";
import { services } from "@/server/services";
import { initLocale } from "@/i18n/server";
import { tx } from "@/lib/format";
import { Skeleton } from "@/ui/Skeleton";
import { AdminShell, type ScopeOption } from "./AdminShell";
import styles from "./Shell.module.css";

function flatten(nodes: OrgTreeNode[], locale: "en" | "hi", depth = 0, out: ScopeOption[] = []): ScopeOption[] {
  for (const n of nodes) {
    if (n.active) {
      out.push({ id: n.id, label: tx(n.name, locale), kind: n.kind, depth });
      // Switching to a single samithi is useful for district and state users too.
      flatten(n.children, locale, depth + 1, out);
    }
  }
  return out;
}

export async function PortalGate({ children }: { children: ReactNode }) {
  const locale = await initLocale();
  await connection();
  const session = await getSession();
  if (!session) return <>{children}</>;
  const { actor, me } = session;
  const portal = services().portal;
  const [tree, approvals] = await Promise.all([
    actor.permissions.has("org.read") ? portal.org.tree(actor).catch(() => []) : Promise.resolve([]),
    actor.permissions.has("approvals.read")
      ? portal.approvals.list(actor, { tab: "plans", page: 1, pageSize: 1 }).catch(() => null)
      : Promise.resolve(null),
  ]);
  return (
    <AdminShell me={me} scopes={flatten(tree, locale)} approvalsCount={approvals?.meta.counts.plans ?? 0}>
      {children}
    </AdminShell>
  );
}

export function ShellSkeleton() {
  return (
    <div className={styles.shell}>
      <div className={styles.side}>
        <div className={styles.brand}>
          <Skeleton width={36} height={36} radius={18} />
          <Skeleton width={120} height={16} />
        </div>
        <div className={styles.navBody}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} height={36} radius={18} />
          ))}
        </div>
      </div>
      <div className={styles.col}>
        <div className={styles.top}>
          <Skeleton width={180} height={40} radius={20} />
        </div>
        <div className={styles.main}>
          <div className={styles.inner}>
            <Skeleton width="40%" height={32} />
          </div>
        </div>
      </div>
    </div>
  );
}
