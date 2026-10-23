import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ErrorView } from "@/features/errors/ErrorView";
import { initLocale } from "@/i18n/server";

// A deliberate 404 never renders a shell, so instant-navigation validation does not apply.
export const instant = false;

const isMoved = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) === "1";

export async function generateMetadata({ searchParams }: PageProps<"/[locale]/[...rest]">): Promise<Metadata> {
  const locale = await initLocale();
  const moved = isMoved((await searchParams).moved);
  const t = await getTranslations({ locale, namespace: "errors" });
  return { title: moved ? t("movedTitle") : t("notFoundTitle"), robots: { index: false } };
}

/**
 * Any path without a page inside a locale renders the localised not-found page. The proxy
 * sends an old saidelhi.org address with no known new home here as `?moved=1`, which gets
 * the "This page moved when our site changed" variant (spec 18).
 */
export default async function CatchAll({ searchParams }: PageProps<"/[locale]/[...rest]">) {
  await initLocale();
  if (isMoved((await searchParams).moved)) return <ErrorView kind="moved" />;
  notFound();
}
