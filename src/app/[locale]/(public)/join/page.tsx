import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { JoinQuery } from "@/contract";
import { JoinView } from "@/features/join/JoinView";
import { getDistricts, getJoin } from "@/features/public/data";
import Loading from "./loading";
import { initLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await initLocale();
  const t = await getTranslations({ locale, namespace: "join" });
  return { title: t("metaTitle"), description: t("lead") };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function JoinContent({ searchParams }: PageProps<"/[locale]/join">) {
  await initLocale();
  const sp = await searchParams;
  // Unusable filter values (bad date, unknown seva type) are dropped, never an error page.
  const raw = { district: first(sp.district), sevaType: first(sp.sevaType), from: first(sp.from), to: first(sp.to), page: first(sp.page) };
  const parsed = JoinQuery.safeParse(raw);
  const q = parsed.success
    ? parsed.data
    : JoinQuery.parse({
        district: JoinQuery.shape.district.safeParse(raw.district).data,
        sevaType: JoinQuery.shape.sevaType.safeParse(raw.sevaType).data,
        from: JoinQuery.shape.from.safeParse(raw.from).data,
        to: JoinQuery.shape.to.safeParse(raw.to).data,
      });
  const [data, districts] = await Promise.all([getJoin(q), getDistricts()]);
  return <JoinView data={data} q={q} districts={districts} />;
}

export default function JoinPage(props: PageProps<"/[locale]/join">) {
  return (
    <Suspense fallback={<Loading />}>
      <JoinContent {...props} />
    </Suspense>
  );
}
