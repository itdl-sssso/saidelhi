import { Suspense } from "react";
import { initLocale } from "@/i18n/server";
import { getDiscourseFlag } from "@/features/discourses/data";
import { MAIN_ID, SiteFooter, SiteHeader, SkipLink } from "@/features/shell";

async function HeaderWithFlags() {
  return <SiteHeader discourses={await getDiscourseFlag()} />;
}

export default async function PublicLayout({ children }: LayoutProps<"/[locale]">) {
  await initLocale();
  return (
    <>
      <SkipLink />
      {/* Dynamic routes don't know their URL while prerendering: show the same bar meanwhile. */}
      <Suspense fallback={<SiteHeader pathless />}>
        <HeaderWithFlags />
      </Suspense>
      <main id={MAIN_ID} tabIndex={-1} className="flex flex-1 flex-col pt-[var(--header-h)] focus-visible:shadow-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
