import { useTranslations } from "next-intl";
import { NavBar, type NavGroup } from "@/ui/NavBar";
import { LanguageToggle } from "./LanguageToggle";
import { DONATE_URL, EMBLEM_SRC, SAICONNECT_URL } from "./links";

export type SiteHeaderProps = {
  /** Feature flag `discourses`: the nav item stays hidden until the Trust grants permission. */
  discourses?: boolean;
};

export function SiteHeader({ discourses = false }: SiteHeaderProps) {
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
        { href: DONATE_URL, label: t("donate"), icon: "heart", external: true },
      ],
    },
  ];

  return (
    <NavBar
      orgName={tm("orgName")}
      region={tm("region")}
      emblemSrc={EMBLEM_SRC}
      quickLinks={[
        { href: "/calendar", label: t("calendar"), icon: "calendar-days" },
        { href: "/centres/map", label: t("findCentre"), icon: "map-pin" },
      ]}
      groups={groups}
      donate={{ href: DONATE_URL, label: t("donate") }}
      utilityLinks={[
        { href: SAICONNECT_URL, label: t("saiConnectLabel"), icon: "log-in", external: true },
        { href: "/admin/login", label: t("coordinatorLogin"), icon: "lock", quiet: true },
      ]}
      languageSwitch={<LanguageToggle />}
    />
  );
}
