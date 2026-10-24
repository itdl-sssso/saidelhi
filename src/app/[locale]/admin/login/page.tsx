import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitch } from "@/features/admin/LanguageSwitch";
import { MAIN_ID, SkipLink } from "@/features/shell";
import { LoginForm } from "@/features/admin/login/LoginForm";
import styles from "@/features/admin/login/Login.module.css";
import { one } from "@/features/admin/server";
import { Link, redirect } from "@/i18n/navigation";
import { initLocale } from "@/i18n/server";
import { getSession } from "@/server/auth/session";
import { Skeleton } from "@/ui/Skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: await initLocale(), namespace: "admin.login" });
  return { title: t("metaTitle") };
}

/** Only same-site portal paths; anything else falls back to the overview. */
function safeNext(raw: string | undefined): string {
  if (!raw || !/^\/admin(\/|\?|$)/.test(raw) || raw.startsWith("/admin/login")) return "/admin";
  return raw;
}

async function LoginContent({ searchParams }: PageProps<"/[locale]/admin/login">) {
  const locale = await initLocale();
  const next = safeNext(one((await searchParams).next));
  await connection();
  if (await getSession()) redirect({ href: next, locale });
  return (
    <div className={styles.stage}>
      <SkipLink />
      <header className={styles.bar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.ring} aria-hidden="true" />
          <span className={styles.name}>SSSSO Delhi NCR</span>
        </Link>
        <LanguageSwitch />
      </header>
      <main id={MAIN_ID} tabIndex={-1} className={styles.wrap}>
        <LoginForm next={next} />
      </main>
    </div>
  );
}

export default function LoginPage(props: PageProps<"/[locale]/admin/login">) {
  return (
    <Suspense
      fallback={
        <div className={styles.stage}>
          <div className={styles.wrap}>
            <div className={styles.card}>
              <Skeleton width="30%" height={12} />
              <Skeleton width="70%" height={30} />
              <Skeleton height={48} radius={12} />
              <Skeleton height={44} radius={22} />
            </div>
          </div>
        </div>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}
