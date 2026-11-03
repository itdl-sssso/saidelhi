import { Suspense } from "react";
import { connection } from "next/server";
import type { DiscourseCard } from "@/contract";
import { DiscourseCardView } from "@/features/discourses/DiscourseCard";

/** Fisher–Yates; returns the first `n` of a shuffled copy. */
function pickRandom<T>(pool: T[], n: number): T[] {
  const a = pool.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function CardList({ items, className }: { items: DiscourseCard[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((d) => (
        <li key={d.slug}>
          <DiscourseCardView d={d} />
        </li>
      ))}
    </ul>
  );
}

/** Runs per request (after `connection()`), so every visit gets a fresh pick. Only the picked cards are sent. */
async function RandomPicks({ pool, count, className }: { pool: DiscourseCard[]; count: number; className?: string }) {
  await connection();
  return <CardList items={pickRandom(pool, count)} className={className} />;
}

/**
 * Home "From His discourses": a random few on every visit. The rest of the home page stays in the
 * cached static shell; this list is a dynamic hole. The shell carries the first `count` as the
 * fallback, so crawlers and no-JS visitors still see discourses until the random pick streams in.
 */
export function HomeDiscourses({ pool, count = 3, className }: { pool: DiscourseCard[]; count?: number; className?: string }) {
  return (
    <Suspense fallback={<CardList items={pool.slice(0, count)} className={className} />}>
      <RandomPicks pool={pool} count={count} className={className} />
    </Suspense>
  );
}
