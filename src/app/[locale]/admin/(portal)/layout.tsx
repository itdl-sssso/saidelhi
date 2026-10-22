import { Suspense } from "react";
import { PortalGate, ShellSkeleton } from "@/features/admin/Gate";
import { initLocale } from "@/i18n/server";

export default async function PortalLayout({ children }: LayoutProps<"/[locale]/admin">) {
  await initLocale();
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <PortalGate>{children}</PortalGate>
    </Suspense>
  );
}
