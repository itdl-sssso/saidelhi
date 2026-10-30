"use client";

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "../Button";
import { Icon, type IconName } from "../Icon";
import { cx } from "../cx";
import styles from "./NavBar.module.css";

export type NavItem = {
  /** Locale-free path ("/calendar") or an absolute URL when external. */
  href: string;
  label: string;
  icon: IconName;
  external?: boolean;
};

export type NavGroup = { title: string; items: NavItem[] };

export type NavBarProps = {
  orgName: string;
  region: string;
  emblemSrc: string;
  /** Always-visible shortcuts beside the menu button. */
  quickLinks: NavItem[];
  /** Grouped links in the menu panel. */
  groups: NavGroup[];
  donate: { href: string; label: string; external?: boolean };
  /** Footer row of the panel, e.g. SaiConnect and the coordinator login. */
  utilityLinks: Array<NavItem & { quiet?: boolean }>;
  languageSwitch: ReactNode;
};

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Live navbar: marks the current page from the URL. */
export function NavBar(props: NavBarProps) {
  return <NavBarView {...props} pathname={usePathname()} />;
}

/**
 * The same bar for a known (or unknown, "") path. Used as the prerendered fallback while
 * the URL of a dynamic route is not yet known, so the shell never waits for it.
 */
export function NavBarView({
  pathname,
  orgName,
  region,
  emblemSrc,
  quickLinks,
  groups,
  donate,
  utilityLinks,
  languageSwitch,
}: NavBarProps & { pathname: string }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const close = () => setOpen(false);

  const renderLink = (item: NavItem, className: string, label: ReactNode) =>
    item.external ? (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} onClick={close}>
        {label}
        <span className="sr-only"> {tc("opensNewTab")}</span>
      </a>
    ) : (
      <Link
        href={item.href}
        className={className}
        aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
        onClick={close}
      >
        {label}
      </Link>
    );

  return (
    <header className={styles.header}>
      <div ref={rootRef} className={styles.bar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.emblem}>
            <Image src={emblemSrc} alt="" width={42} height={42} priority />
          </span>
          <span className={styles.wordmark}>
            <span className={styles.org}>{orgName}</span>{" "}
            <span className={styles.region}>{region}</span>
          </span>
        </Link>

        <nav aria-label={t("primary")} className={styles.nav}>
          {quickLinks.map((item) => (
            <Fragment key={item.href}>
              {renderLink(
                item,
                styles.item,
                <>
                  <Icon name={item.icon} size={18} />
                  <span className={styles.itemLabel}>{item.label}</span>
                </>,
              )}
            </Fragment>
          ))}
          <span className={styles.sep} aria-hidden="true" />
          <span className={styles.barLang}>{languageSwitch}</span>
          <Button href={donate.href} external={donate.external} icon="heart" iconAfter={donate.external ? "external-link" : undefined}>
            {donate.label}
          </Button>
          <button
            ref={buttonRef}
            type="button"
            className={styles.item}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "x" : "menu"} size={18} />
            <span className={styles.menuLabel}>{open ? t("close") : t("menu")}</span>
          </button>

          <div id={panelId} className={styles.panel} hidden={!open}>
            {groups.map((group) => (
              <div key={group.title} className={styles.group}>
                <h2>{group.title}</h2>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.href}>
                      {renderLink(
                        item,
                        styles.link,
                        <>
                          <Icon name={item.icon} size={18} />
                          <span>{item.label}</span>
                          {item.external ? (
                            <span className={styles.ext}>
                              <Icon name="external-link" size={16} />
                            </span>
                          ) : null}
                        </>,
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className={styles.foot}>
              {languageSwitch}
              <div className={styles.footLinks}>
                {utilityLinks.map((item) => (
                  <Fragment key={item.href}>
                    {renderLink(
                      item,
                      cx(styles.footLink, item.quiet && styles.quiet),
                      <>
                        <Icon name={item.icon} size={16} />
                        {item.label}
                        {item.external ? <Icon name="external-link" size={16} /> : null}
                      </>,
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
