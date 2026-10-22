import { Suspense } from "react";
import { FormView } from "@/features/formlink/ui/FormView";
import { initLocale } from "@/i18n/server";

async function Content({ params }: PageProps<"/[locale]/f/[token]/form">) {
  await initLocale();
  const { token } = await params;
  return <FormView token={token} />;
}

export default function FormPage(props: PageProps<"/[locale]/f/[token]/form">) {
  return (
    <Suspense>
      <Content {...props} />
    </Suspense>
  );
}
