"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type BuilderCheck, type FormDefinition, chatQuestions, excelColumns } from "@/contract";
import type { AppLocale } from "@/lib/format";
import { Icon } from "@/ui/Icon";
import { Panel } from "../kit";
import { flatFields } from "./builder-model";
import styles from "../Admin.module.css";
import s from "./Builder.module.css";

type Tab = "excel" | "whatsapp" | "checks";

export function BuilderDrawer({ def, purpose, checks, onPick }: { def: FormDefinition; purpose: "report" | "desk" | "public"; checks: BuilderCheck[]; onPick: (fieldId: string) => void }) {
  const t = useTranslations("admin.builder");
  const [tab, setTab] = useState<Tab>("checks");
  const failing = checks.filter((c) => !c.ok && c.level === "error").length;
  return (
    <div className={s.drawer}>
      <Panel
        title={
          <div className={styles.tabs} role="group" aria-label={t("drawer")}>
            {(["checks", "excel", "whatsapp"] as const).map((id) => (
              <button key={id} type="button" className={styles.tab} aria-pressed={tab === id} onClick={() => setTab(id)}>
                {t(`drawerTab.${id}`)}
                {id === "checks" && failing > 0 ? <span className={styles.tabCountHot}>{failing}</span> : null}
              </button>
            ))}
          </div>
        }
        flush
      >
        <div className={s.drawerBd}>
          {tab === "excel" ? <ExcelPreview def={def} purpose={purpose} /> : null}
          {tab === "whatsapp" ? <WhatsAppPreview def={def} /> : null}
          {tab === "checks" ? <Checks def={def} checks={checks} onPick={onPick} /> : null}
        </div>
      </Panel>
    </div>
  );
}

function ExcelPreview({ def, purpose }: { def: FormDefinition; purpose: "report" | "desk" | "public" }) {
  const t = useTranslations("admin.builder");
  const cols = excelColumns(def);
  if (purpose !== "report") return <p className={styles.cap}>{t("excelNa")}</p>;
  return (
    <div className={styles.stack} style={{ gap: 10 }}>
      <p className={styles.cap}>{t("excelNote")}</p>
      <div className={s.excel}>
        <table>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.header} data-locked={c.locked} scope="col">
                  {c.locked ? "🔒 " : ""}
                  {c.header}
                  {c.required ? " *" : ""}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
    </div>
  );
}

function WhatsAppPreview({ def }: { def: FormDefinition }) {
  const t = useTranslations("admin.builder");
  const locale = useLocale() as AppLocale;
  const [lang, setLang] = useState<AppLocale>(locale);
  const qs = chatQuestions(def, {});
  return (
    <div className={styles.stack} style={{ gap: 10 }}>
      <div className={styles.row}>
        <p className={styles.cap} style={{ flex: 1, minWidth: 200 }}>
          {t("chatNote")}
        </p>
        <div className={styles.tabs} role="group" aria-label={t("chatLang")}>
          {(["en", "hi"] as const).map((l) => (
            <button key={l} type="button" className={styles.tab} aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l === "en" ? "EN" : "हिं"}
            </button>
          ))}
        </div>
      </div>
      {qs.length === 0 ? (
        <p className={styles.cap}>{t("chatNone")}</p>
      ) : (
        <div className={s.chat} lang={lang}>
          {qs.map((f, i) => (
            <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className={`${s.bubble} ${s.bubbleIn}`}>
                {i + 1}. {(lang === "hi" && f.label.hi) || f.label.en || t("untitled")}
                {f.help ? <div className={styles.cap}>{(lang === "hi" && f.help.hi) || f.help.en}</div> : null}
              </div>
              <div className={`${s.bubble} ${s.bubbleOut}`}>{t("chatReply")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Checks({ def, checks, onPick }: { def: FormDefinition; checks: BuilderCheck[]; onPick: (id: string) => void }) {
  const t = useTranslations("admin.builder");
  const locale = useLocale() as AppLocale;
  const flat = flatFields(def);
  const name = (id: string) => {
    if (id.startsWith("section:")) return def.sections.find((x) => x.id === id.slice(8))?.title.en || id;
    const f = flat.find((x) => x.f.id === id)?.f;
    return (f && ((locale === "hi" && f.label.hi) || f.label.en)) || id;
  };
  return (
    <ul className={s.checks}>
      {checks.map((c) => {
        const tone = c.ok ? s.ckOk : c.level === "error" ? s.ckBad : s.ckWarn;
        return (
          <li key={c.key}>
            <span className={tone}>
              <Icon name={c.ok ? "circle-check" : c.level === "error" ? "circle-x" : "triangle-alert"} size={20} label={c.ok ? t("passed") : c.level === "error" ? t("blocks") : t("warns")} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b className={styles.strong}>{t(`check.${c.key}.title`)}</b>
              <div className={styles.cap}>{c.ok ? t(`check.${c.key}.ok`) : t(`check.${c.key}.bad`)}</div>
              {!c.ok && c.fieldIds.length > 0 ? (
                <div className={styles.row} style={{ marginTop: 4 }}>
                  {c.fieldIds.slice(0, 8).map((id) =>
                    id.startsWith("section:") ? (
                      <span key={id} className={s.tag}>
                        {name(id)}
                      </span>
                    ) : (
                      <button key={id} type="button" className={styles.linkBtn} onClick={() => onPick(id)}>
                        {name(id)}
                      </button>
                    ),
                  )}
                  {c.fieldIds.length > 8 ? <span className={styles.cap}>+{c.fieldIds.length - 8}</span> : null}
                </div>
              ) : null}
              {!c.ok && c.detail.length > 0 ? <div className={s.mono}>{c.detail.slice(0, 4).join(" · ")}</div> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}


