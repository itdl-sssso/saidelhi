import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/server";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { QuoteCard } from "@/ui/QuoteCard";
import { SectionHeading } from "@/ui/SectionHeading";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "home" });
  return { title: t("metaTitle") };
}

// Temporary M0 home: the real Home (spec 01) arrives in M1.
export default async function HomePage() {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <section className="flex-1 bg-linear-to-b from-blue-50 to-cream" aria-labelledby="home-title">
      <div className="mx-auto grid max-w-site items-center gap-12 px-5 py-16 md:px-10 md:py-24 xl:grid-cols-[1.05fr_0.95fr] xl:gap-16">
        <div className="flex flex-col gap-8">
          <SectionHeading
            level={1}
            titleId="home-title"
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("lead")}
          />
          <div className="flex flex-wrap gap-3">
            <Button href="/join" size="lg" iconAfter="arrow-right">
              {t("joinSeva")}
            </Button>
            <Button href="/centres/map" size="lg" variant="outline" icon="map-pin">
              {t("findCentre")}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <QuoteCard label={t("thoughtLabel")} quote={t("thought")} attribution={t("attribution")} />
          <Alert tone="info" title={t("rebuildTitle")}>
            {t("rebuildBody")}
          </Alert>
        </div>
      </div>
    </section>
  );
}
