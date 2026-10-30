import { useTranslations } from "next-intl";
import { NavBar, type NavBarProps, NavBarView, type NavGroup } from "@/ui/NavBar";
import { LanguageToggle, LanguageToggleView } from "./LanguageToggle";
import { EMBLEM_SRC, SAICONNECT_URL } from "./links";

export type SiteHeaderProps = {
  /** Feature flag `discourses`: the nav item stays hidden until the Trust grants permission. */
  discourses?: boolean;
  /** Render without reading the URL: the Suspense fallback for routes whose path is dynamic. */
  pathless?: boolean;
};

export function SiteHeader({ discourses = false, pathless = false }: SiteHeaderProps) {
  const t = useTranslations("nav");
  const tm = useTranslations("meta");

  const groups: NavGroup[] = [
    {
      title: t("groupLearn"),
      items: [
        { href: "/about", label: t("about"), icon: "info" },
        { href: "/values/shanti", label: t("bhajans"), icon: "music" },
        ...(discourses ? [{ href: "/discourses", label: t("discourses"), icon: "book-open" as const }] : []),
        { href: "/news", label: t("news"), icon: "newspaper" },
        { href: "/gallery", label: t("gallery"), icon: "image" },
      ],
    },
    {
      title: t("groupVisit"),
      items: [
        { href: "/calendar", label: t("calendar"), icon: "calendar-days" },
        { href: "/centres/map", label: t("findCentre"), icon: "map-pin" },
        { href: "/impact", label: t("impact"), icon: "chart-column" },
      ],
    },
    {
      title: t("groupServe"),
      items: [
        { href: "/programs", label: t("programs"), icon: "hand-heart" },
        { href: "/join", label: t("getInvolved"), icon: "heart-handshake" },
        { href: "/donate", label: t("donate"), icon: "heart" },
      ],
    },
  ];

  const props: NavBarProps = {
    orgName: tm("orgName"),
    region: tm("region"),
    emblemSrc: EMBLEM_SRC,
    quickLinks: [
      { href: "/calendar", label: t("calendar"), icon: "calendar-days" },
      { href: "/centres/map", label: t("findCentre"), icon: "map-pin" },
    ],
    groups,
    donate: { href: "/donate", label: t("donate") },
    utilityLinks: [
      { href: SAICONNECT_URL, label: t("saiConnectLabel"), icon: "log-in", external: true },
      { href: "/admin/login", label: t("coordinatorLogin"), icon: "lock", quiet: true },
    ],
    languageSwitch: pathless ? <LanguageToggleView pathname="/" /> : <LanguageToggle />,
  };
  return pathless ? <NavBarView {...props} pathname="" /> : <NavBar {...props} />;
}
