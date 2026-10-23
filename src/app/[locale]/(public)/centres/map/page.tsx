import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getCentresSearch, getDistricts } from "@/features/public/data";
import { MapView } from "@/features/map/MapView";
import { parseSearch } from "@/features/map/model";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";
import { type AppLocale, tx } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "map" });
  return { title: t("metaTitle"), description: t("lead") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function MapContent({ searchParams }: PageProps<"/[locale]/centres/map">) {
  const locale = (await initLocale()) as AppLocale;
  const sp = await searchParams;
  const raw = (first(sp.q) ?? "").trim().slice(0, 80);
  const search = parseSearch(raw);
  const district = first(sp.district) ?? "";
  const districtSlug = SLUG.test(district) ? district : "";
  const [centres, districts] = await Promise.all([
    getCentresSearch({ ...search, district: districtSlug || undefined }),
    getDistricts(),
  ]);
  return (
    <MapView
      centres={centres}
      q={raw}
      pincode={search.pincode ?? null}
      district={districtSlug}
      districts={districts.map((d) => ({ value: d.district.slug, label: tx(d.district.name, locale) }))}
    />
  );
}

export default function MapPage(props: PageProps<"/[locale]/centres/map">) {
  return (
    <Suspense fallback={<Loading />}>
      <MapContent {...props} />
    </Suspense>
  );
}
