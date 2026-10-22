import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: await initLocale(), namespace: "admin.meta" });
  return { title: { default: t("title"), template: `%s · ${t("title")}` }, robots: { index: false, follow: false } };
}

export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return children;
}
