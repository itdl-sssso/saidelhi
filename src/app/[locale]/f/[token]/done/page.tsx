import { Suspense } from "react";
import { DoneView } from "@/features/formlink/ui/DoneView";
import { initLocale } from "@/i18n/server";

async function Content({ params }: PageProps<"/[locale]/f/[token]/done">) {
  await initLocale();
  const { token } = await params;
  return <DoneView token={token} />;
}

export default function DonePage(props: PageProps<"/[locale]/f/[token]/done">) {
  return (
    <Suspense>
      <Content {...props} />
    </Suspense>
  );
}
