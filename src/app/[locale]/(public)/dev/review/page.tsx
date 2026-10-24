import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buildCatalog } from "@/features/dev/review/catalog";
import { ReviewTracker } from "@/features/dev/review/ReviewTracker";
import { resolveSamples } from "@/features/dev/review/samples";
import { initLocale } from "@/i18n/server";
import { listRounds } from "@/server/dev/review-store";

export const metadata = { title: "Review tracker (dev)", robots: { index: false } };

async function Tracker() {
  await connection();
  const [samples, rounds] = await Promise.all([resolveSamples(), listRounds()]);
  return <ReviewTracker catalog={buildCatalog(samples)} initialRounds={rounds} />;
}

// Development only: 404 in production, like /dev/ui and /dev/whatsapp.
export default async function ReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  await initLocale();
  return (
    <Suspense fallback={<p role="status" style={{ padding: 24 }}>Loading review tracker</p>}>
      <Tracker />
    </Suspense>
  );
}
