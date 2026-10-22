import type { Metadata } from "next";
import { FormChrome } from "@/features/formlink/ui/Chrome";
import { SwRegister } from "@/features/formlink/ui/SwRegister";
import { initLocale } from "@/i18n/server";

// Links carry a secret token: keep them out of search results and never leak them in Referer.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function FormLinkLayout({ children }: LayoutProps<"/[locale]/f">) {
  await initLocale();
  return (
    <FormChrome>
      <SwRegister />
      {children}
    </FormChrome>
  );
}
