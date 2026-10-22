import type { ReactNode } from "react";
import Link from "next/link";
import en from "../../messages/en.json";
import hi from "../../messages/hi.json";
import { fontVariables } from "./fonts";

/**
 * Bilingual full document for the two cases that render outside the locale layout:
 * unmatched non-locale URLs (app/not-found.tsx) and root layout failures (app/global-error.tsx).
 */
export function StandaloneError({ kind, action }: { kind: "notFound" | "error"; action?: ReactNode }) {
  const pick = (m: typeof en) =>
    kind === "notFound"
      ? { title: m.errors.notFoundTitle, body: m.errors.notFoundBody }
      : { title: m.errors.errorTitle, body: m.errors.errorBody };
  const copy = { en: pick(en), hi: pick(hi) };
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <title>{copy.en.title}</title>
        <main className="mx-auto flex max-w-(--container-prose) flex-1 flex-col justify-center gap-6 px-5 py-16">
          <div role="presentation" className="h-1 w-full bg-(--dharma-rule)" />
          <section className="flex flex-col gap-2">
            <h1 className="text-[32px]">{copy.en.title}</h1>
            <p className="text-slate-700">{copy.en.body}</p>
          </section>
          <section lang="hi" className="flex flex-col gap-2">
            <h2 className="text-[26px]">{copy.hi.title}</h2>
            <p className="text-slate-700">{copy.hi.body}</p>
          </section>
          <p className="flex flex-wrap gap-6">
            {action}
            <Link href="/">{en.errors.goHome}</Link>
            <Link href="/hi" lang="hi">
              {hi.errors.goHome}
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
