"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type ConversationDetail, type ConversationRow, type PageMeta, adminEndpoints } from "@/contract";
import { useRouter } from "@/i18n/navigation";
import { type AppLocale } from "@/lib/format";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { SideSheet } from "@/ui/SideSheet";
import { SkeletonRows } from "@/ui/Skeleton";
import { ThreadView } from "../inbox/SourcePane";
import { fmtShortDateTime } from "../time";
import { useApi } from "../useApi";
import { hrefWith } from "../url";
import { FIXTURE_LOG, fixtureConversation } from "./__fixtures__";
import { Loadable } from "./WhatsAppAdmin";
import styles from "../Admin.module.css";
import s from "./WhatsApp.module.css";

const PAGE_SIZE = 20;

export function ConversationLog() {
  const t = useTranslations("admin.whatsapp.log");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const router = useRouter();
  const params = Object.fromEntries(sp.entries());
  const q = sp.get("q") ?? "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const [draft, setDraft] = useState(q);
  const [open, setOpen] = useState<string | null>(null);
  const api = useApi<ConversationRow[], PageMeta>(adminEndpoints.waLog({ q: q || undefined, page, pageSize: PAGE_SIZE }), () => ({
    data: FIXTURE_LOG.filter((c) => !q || c.lastText.toLowerCase().includes(q.toLowerCase()) || c.who.label.toLowerCase().includes(q.toLowerCase())),
    meta: { page: 1, pageSize: PAGE_SIZE, total: FIXTURE_LOG.length },
  }));

  return (
    <div className={styles.page}>
      <form
        className={s.search}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(hrefWith("/admin/whatsapp", { ...params, tab: "log" }, { q: draft.trim() || null }));
        }}
      >
        <Input label={t("search")} type="search" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" variant="outline" icon="search">
          {t("searchBtn")}
        </Button>
      </form>
      <p className={s.privacy}>
        <Icon name="lock" size={16} />
        {t("privacy")}
      </p>
      <Loadable api={api}>
        {(rows, meta) =>
          rows.length === 0 ? (
            <EmptyState icon="search-x" title={t("empty")} />
          ) : (
            <>
              <ul className={s.logList}>
                {rows.map((r) => (
                  <li key={r.id}>
                    <button type="button" className={s.logRow} onClick={() => setOpen(r.id)}>
                      <span className={s.logWho}>
                        <span className={styles.tblT}>{r.phone}</span>
                        <span className={styles.cap}>{r.who.label}</span>
                      </span>
                      <span className={s.logText}>{r.lastText}</span>
                      <span className={styles.cap}>
                        {fmtShortDateTime(r.lastAt, locale)} · {t("messages", { n: r.messages })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {(meta?.total ?? 0) > PAGE_SIZE ? <Pagination page={page} pageSize={PAGE_SIZE} total={meta?.total ?? 0} href={(p) => hrefWith("/admin/whatsapp", { ...params, tab: "log" }, { page: p })} /> : null}
            </>
          )
        }
      </Loadable>
      <Thread id={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Thread({ id, onClose }: { id: string | null; onClose: () => void }) {
  const t = useTranslations("admin.whatsapp.log");
  const api = useApi<ConversationDetail>(id ? adminEndpoints.waConversation(id) : null, () => ({ data: fixtureConversation(id ?? "") }));
  return (
    <SideSheet open={id !== null} onClose={onClose} title={api.status === "ready" ? api.data.phone : t("thread")}>
      {api.status === "loading" || !id ? <SkeletonRows /> : api.status === "ready" ? <ThreadView messages={api.data.thread} /> : <EmptyState icon="cloud-off" title={t("threadError")} />}
    </SideSheet>
  );
}
