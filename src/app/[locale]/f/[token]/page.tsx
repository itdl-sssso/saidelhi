import { Suspense } from "react";
import { VerifyView } from "@/features/formlink/ui/VerifyView";
import { initLocale } from "@/i18n/server";

async function Content({ params }: PageProps<"/[locale]/f/[token]">) {
  await initLocale();
  const { token } = await params;
  return <VerifyView token={token} />;
}

export default function VerifyPage(props: PageProps<"/[locale]/f/[token]">) {
  return (
    <Suspense>
      <Content {...props} />
    </Suspense>
  );
}
