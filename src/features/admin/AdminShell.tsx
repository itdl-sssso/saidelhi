"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { EMBLEM_SRC } from "@/features/shell/links";
import { type ReactNode, useState } from "react";
import { type Me, authEndpoints } from "@/contract";
import { MAIN_ID, SkipLink } from "@/features/shell";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { portalRequest } from "@/lib/portal-api";
import { Icon } from "@/ui/Icon";
import { SideSheet } from "@/ui/SideSheet";
import { cx } from "@/ui/cx";
import { useSearchParams } from "next/navigation";
import { LanguageSwitch } from "./LanguageSwitch";
import { Popover } from "./Menu";
import { LogOut, Menu as MenuIcon, User } from "./icons";
import { TAB_ORDER, isActive, navFor } from "./nav";
import styles from "./Shell.module.css";
import menuStyles from "./Admin.module.css";

export interface ScopeOption {
  id: string;
  label: string;
  kind: "ncr" | "district" | "samithi";
  depth: number;
}

interface Props {
  me: Me;
  scopes: ScopeOption[];
  /** Pending plan approvals (nav badge). */
  approvalsCount: number;
  children: ReactNode;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export function AdminShell({ me, scopes, approvalsCount, children }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [more, setMore] = useState(false);
  const groups = navFor(me.permissions);
  const all = groups.flatMap((g) => g.items);
  const counts: Record<string, number> = { approvals: approvalsCount };
  const tabs = TAB_ORDER.flatMap((id) => {
    const item = all.find((i) => i.id === id);
    return item ? [{ ...item, id }] : [];
  }).slice(0, 4);

  const currentScopeId = pathname === "/admin" && search.get("scope") ? search.get("scope") : (me.scope?.id ?? null);
  const current = scopes.find((s) => s.id === currentScopeId);
  const scopeText = current?.label ?? (me.scope ? me.scope.name.en : t("shell.allNcr"));
  const canChoose = scopes.length > 1;

  const signOut = async () => {
    await portalRequest(authEndpoints.logout(), { method: "POST", body: {} });
    router.replace("/admin/login");
    router.refresh();
  };

  const navItem = (i: (typeof all)[number], onClick?: () => void) => (
    <Link key={i.id} href={i.href} className={styles.item} aria-current={isActive(i.href, pathname) ? "page" : undefined} onClick={onClick}>
      <Icon icon={i.icon} size={18} />
      {t(`nav.items.${i.id}`)}
      {counts[i.id] ? (
        <span className={styles.count} aria-label={t("shell.waiting", { count: counts[i.id] })}>
          {counts[i.id]}
        </span>
      ) : i.restricted ? (
        <span className={styles.lock} title={t("shell.restricted")}>
          <Icon name="lock" size={16} />
        </span>
      ) : null}
    </Link>
  );

  return (
    <div className={styles.shell}>
      <SkipLink />
      <nav className={styles.side} aria-label={t("shell.portal")}>
        <Link href="/admin" className={styles.brand}>
          <Image src={EMBLEM_SRC} alt="" width={36} height={36} className={styles.ring} priority />
          <span className={menuStyles.col}>
            <span className={styles.brandName}>SSSSO Delhi NCR</span>
            <span className={styles.brandCap}>{t("shell.portal")}</span>
          </span>
        </Link>
        <div className={styles.navBody}>
          {groups.map((g) => (
            <div key={g.id} role="group" aria-labelledby={`nav-${g.id}`}>
              <p className={styles.grp} id={`nav-${g.id}`}>
                {t(`nav.groups.${g.id}`)}
              </p>
              {g.items.map((i) => navItem(i))}
            </div>
          ))}
        </div>
      </nav>

      <div className={styles.col}>
        <header className={styles.top}>
          {canChoose ? (
            <Popover
              align="left"
              trigger={({ open, toggle, id, ref }) => (
                <button ref={ref} type="button" className={styles.scope} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}>
                  <Icon name="map-pin" size={16} />
                  <span className={styles.scopeLabel}>{scopeText}</span>
                  <Icon name="chevron-down" size={16} />
                </button>
              )}
            >
              {(close) => (
                <div role="listbox" aria-label={t("shell.showDataFor")}>
                  <div className={menuStyles.menuHd}>{t("shell.showDataFor")}</div>
                  {scopes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      aria-selected={s.id === currentScopeId}
                      style={{ paddingLeft: 12 + s.depth * 16 }}
                      onClick={() => {
                        close();
                        router.push(s.id === me.scope?.id || (s.kind === "ncr" && !me.scope) ? "/admin" : { pathname: "/admin", query: { scope: s.id } });
                      }}
                    >
                      <Icon name={s.kind === "ncr" ? "globe" : s.kind === "district" ? "map" : "house"} size={16} />
                      <span style={{ flex: 1 }}>{s.label}</span>
                      {s.id === currentScopeId ? <Icon name="check" size={16} /> : null}
                    </button>
                  ))}
                </div>
              )}
            </Popover>
          ) : (
            <span className={cx(styles.scope, styles.scopeStatic)}>
              <Icon name="map-pin" size={16} />
              <span className={styles.scopeLabel}>{scopeText}</span>
            </span>
          )}
          <span className={styles.spacer} />
          <LanguageSwitch />
          <Popover
            trigger={({ open, toggle, id, ref }) => (
              <button ref={ref} type="button" className={styles.prof} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}>
                <span className={styles.av}>{initials(me.user.name)}</span>
                <span className={styles.profTxt}>
                  <span className={styles.profName}>{me.user.name}</span>
                  <span className={styles.profRole}>{t(`roles.${me.role}`)}</span>
                </span>
              </button>
            )}
          >
            {(close) => (
              <div role="menu">
                <div className={menuStyles.menuHd}>
                  {me.user.name} · {me.user.phone}
                  <br />
                  {t(`roles.${me.role}`)}
                </div>
                <hr />
                <Link href="/" role="menuitem" onClick={close}>
                  <Icon icon={User} size={16} />
                  {t("shell.viewPublic")}
                </Link>
                <hr />
                <button type="button" role="menuitem" className={menuStyles.danger} onClick={signOut}>
                  <Icon icon={LogOut} size={16} />
                  {t("shell.signOut")}
                </button>
              </div>
            )}
          </Popover>
        </header>
        <main id={MAIN_ID} tabIndex={-1} className={styles.main}>
          <div className={styles.inner}>{children}</div>
        </main>
      </div>

      <nav className={styles.tabbar} aria-label={t("shell.portal")} style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, 1fr)` }}>
        {tabs.map((i) => (
          <Link key={i.id} href={i.href} className={styles.tab} aria-current={isActive(i.href, pathname) ? "page" : undefined}>
            <span className={styles.tabIc}>
              <Icon icon={i.icon} size={20} />
              {counts[i.id] ? <span className={styles.count}>{counts[i.id]}</span> : null}
            </span>
            {t(`nav.short.${i.id}`)}
          </Link>
        ))}
        <button type="button" className={styles.tab} onClick={() => setMore(true)} aria-haspopup="dialog">
          <span className={styles.tabIc}>
            <Icon icon={MenuIcon} size={20} />
          </span>
          {t("shell.more")}
        </button>
      </nav>

      <SideSheet open={more} onClose={() => setMore(false)} title={t("shell.more")} side="bottom">
        {groups.map((g) => (
          <div key={g.id}>
            <p className={styles.grp}>{t(`nav.groups.${g.id}`)}</p>
            <div className={styles.moreGrid}>{g.items.map((i) => navItem(i, () => setMore(false)))}</div>
          </div>
        ))}
        <div className={styles.moreFoot}>
          <button type="button" className={cx(styles.item, styles.danger)} onClick={signOut}>
            <Icon icon={LogOut} size={18} />
            {t("shell.signOut")}
          </button>
        </div>
      </SideSheet>
    </div>
  );
}
