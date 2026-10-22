import { initLocale } from "@/i18n/server";
import { MAIN_ID, SiteFooter, SiteHeader, SkipLink } from "@/features/shell";

export default async function PublicLayout({ children }: LayoutProps<"/[locale]">) {
  await initLocale();
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id={MAIN_ID} tabIndex={-1} className="flex flex-1 flex-col focus-visible:shadow-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
