import { notFound } from "next/navigation";
import { Simulator } from "@/features/dev/Simulator";
import { initLocale } from "@/i18n/server";

export const metadata = { title: "WhatsApp bot simulator (dev)" };

// Development only: 404 in production, like /dev/ui.
export default async function SimulatorPage() {
  if (process.env.NODE_ENV === "production") notFound();
  await initLocale();
  return <Simulator />;
}
