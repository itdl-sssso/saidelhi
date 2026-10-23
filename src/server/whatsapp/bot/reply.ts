import type { Locale } from "@/contract";
import { type Bi, pick } from "./copy";
import type { Turn } from "./types";

const clip = (s: string, n: number) => (s.length <= n ? s : `${Array.from(s).slice(0, n - 1).join("")}…`);

/** Text of a Bi or plain string for this turn's language. */
export const txt = (t: Turn, v: Bi | string): string => (typeof v === "string" ? v : pick(t.locale, v));
export const txtL = (l: Locale, v: Bi | string): string => (typeof v === "string" ? v : pick(l, v));

export function say(t: Turn, text: Bi | string): void {
  t.replies.push({ kind: "text", text: txt(t, text), buttons: null, list: null });
}

/** Up to 3 quick-reply buttons (title ≤ 20 chars). */
export function buttons(t: Turn, text: Bi | string, btns: { id: string; label: Bi | string }[]): void {
  t.replies.push({
    kind: "buttons",
    text: txt(t, text),
    buttons: btns.slice(0, 3).map((b) => ({ id: b.id, title: clip(txt(t, b.label), 20) })),
    list: null,
  });
}

export interface ListRow {
  id: string;
  title: Bi | string;
  description?: Bi | string | null;
}

/** List message, up to 10 rows (title ≤ 24 chars, description ≤ 72). */
export function list(t: Turn, text: Bi | string, button: Bi | string, rows: ListRow[], sectionTitle: Bi | string = ""): void {
  t.replies.push({
    kind: "list",
    text: txt(t, text),
    buttons: null,
    list: {
      button: clip(txt(t, button), 20),
      sections: [
        {
          title: clip(txt(t, sectionTitle) || "·", 24),
          rows: rows.slice(0, 10).map((r) => ({ id: r.id, title: clip(txt(t, r.title), 24), description: r.description ? clip(txt(t, r.description), 72) : null })),
        },
      ],
    },
  });
}

export const setStep = (t: Turn, flow: string | null, step: string | null, data: Record<string, unknown> = t.conv.state.data) => {
  t.conv.state = { flow, step, data };
};

export const resetFlow = (t: Turn) => {
  t.conv.state = { flow: null, step: null, data: {} };
  t.conv.expiresAt = null;
};
