import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { routing } from "@/i18n/routing";
import { env } from "@/server/env";
import { ToastProvider } from "@/ui/Toast";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: await initLocale(), namespace: "meta" });
  return {
    // Absolute og:image URLs for link previews (WhatsApp etc.); without it they point at localhost.
    metadataBase: new URL(env().APP_URL),
    title: { default: t("siteName"), template: `%s · ${t("siteName")}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await initLocale();
  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <NextIntlClientProvider>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
