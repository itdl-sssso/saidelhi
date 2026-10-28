// The WhatsApp bot (spec 50): one inbound message in, replies out. Conversation
// state lives in whatsapp_conversation (flow/step/data, 30-minute idle expiry);
// the flows themselves are small step machines in plan/report/approvals/public.
import { ulid } from "ulidx";
import type { WaOutbound } from "@/contract";
import type { OutboundMessage } from "../../providers/whatsapp/types";
import { phoneHash, normalisePhone } from "../../security/phone";
import { ensureConversation, recordMessage } from "../conversations";
import { answerStep, approvalsStep, decide, showCard, startApprovals } from "./approvals";
import { COPY, LABEL } from "./copy";
import { galleryFlow, startGallery } from "./gallery";
import { canApprove, isCoordinator, showMenu } from "./menu";
import { words } from "./parse";
import { planFlow } from "./plan";
import { contactFlow, handoff, help, joinFlow, myEvents, nearFlow } from "./public";
import { buttons, resetFlow, say } from "./reply";
import { reportFlow } from "./report";
import type { BotDeps, BotInput, Flow, Turn } from "./types";

/** Idle time after which a flow is dropped ("Let's start again"). */
export const FLOW_TIMEOUT_MS = 30 * 60 * 1000;

export interface InboundMessage extends BotInput {
  /** Sender, E.164 (or digits as Meta sends them). */
  from: string;
  /** Provider message id (wamid), stored for webhook de-duplication. */
  providerId?: string;
}

const FLOWS: Record<string, Flow | undefined> = {
  plan: planFlow,
  report: reportFlow,
  near: nearFlow,
  contact: contactFlow,
  join: joinFlow,
  approvals: { start: async (t) => startApprovals(t), step: approvalsStep },
  answer: { start: async () => undefined, step: answerStep },
  gallery: galleryFlow,
};

const MENU_WORDS = new Set(["menu", "start", "hi", "hello", "hey", "namaste", "namaskar", "नमस्ते", "मेनू", "home", "back", "होम"]);
const HELP_WORDS = new Set(["help", "मदद", "सहायता", "sahayata", "madad"]);
const CANCEL_WORDS = new Set(["cancel", "रद्द", "radd", "quit", "exit"]);
const LANG_WORDS = new Set(["language", "bhasha", "भाषा", "lang"]);
const HUMAN_WORDS = new Set(["human", "agent", "person", "coordinator", "व्यक्ति"]);
const STOP_WORDS = new Set(["stop", "unsubscribe", "बंद", "रोकें"]);
const YES_WORDS = new Set(["yes", "y", "haan", "han", "ha", "हाँ", "हां", "ok", "okay"]);
const COMMANDS: Record<string, string> = {
  plan: "plan", "plan an activity": "plan", yojana: "plan", योजना: "plan",
  report: "report", "report totals": "report", रिपोर्ट: "report",
  events: "events", "my events": "events", कार्यक्रम: "events",
  approvals: "approvals", approval: "approvals", स्वीकृतियाँ: "approvals",
  near: "near", nearby: "near", "near me": "near", "whats on": "near", "what s on near me": "near",
  join: "join", "join updates": "join", updates: "join",
  contact: "contact", "contact a centre": "contact", centre: "contact", center: "contact",
};
const DECISION_WORDS: Record<string, "yes" | "no" | "ask"> = {
  approve: "yes", approved: "yes", स्वीकृत: "yes", reject: "no", अस्वीकार: "no", ask: "ask", पूछें: "ask",
};

function chooseLanguage(t: Turn): void {
  buttons(t, COPY.askLanguage, [
    { id: "lang:en", label: LABEL.english },
    { id: "lang:hi", label: LABEL.hindi },
  ]);
}

async function startFlow(t: Turn, name: string): Promise<void> {
  if (name === "events") return myEvents(t);
  if (name === "approvals") {
    if (!canApprove(t)) return say(t, COPY.notAllowed);
    return startApprovals(t);
  }
  if ((name === "plan" || name === "report") && !isCoordinator(t)) return say(t, COPY.notAllowed);
  const flow = FLOWS[name];
  if (!flow) return showMenu(t);
  resetFlow(t);
  return flow.start(t);
}

/** The menu/command a message stands for, or null. */
function commandOf(input: BotInput): string | null {
  if (input.replyId?.startsWith("m:")) return input.replyId.slice(2);
  const w = words(input.text).join(" ");
  if (!w) return null;
  if (MENU_WORDS.has(w)) return "menu";
  if (HELP_WORDS.has(w)) return "help";
  if (HUMAN_WORDS.has(w)) return "human";
  return COMMANDS[w] ?? null;
}

async function unrecognised(t: Turn): Promise<void> {
  const strikes = Number(t.conv.state.data.strikes ?? 0) + 1;
  if (strikes >= 2) {
    buttons(t, COPY.unrecognisedAgain, [
      { id: "h:human", label: LABEL.human },
      { id: "m:menu", label: LABEL.menu },
    ]);
    t.conv.state = { flow: null, step: null, data: {} };
    return;
  }
  say(t, COPY.unrecognised);
  showMenu(t, false);
  t.conv.state = { flow: null, step: null, data: { strikes } };
}

async function optInKeywords(t: Turn): Promise<boolean> {
  const w = words(t.input.text).join(" ");
  if (!w) return false;
  const repo = t.deps.repo.wa;
  const rec = await repo.optInByHash(t.conv.phoneHash);
  if (STOP_WORDS.has(w)) {
    if (rec && rec.status !== "stopped") await repo.saveOptIn({ ...rec, status: "stopped", stoppedAt: t.deps.now() });
    if (!t.conv.locale) t.conv.locale = rec?.locale ?? "en";
    t.locale = t.conv.locale;
    say(t, COPY.optOutDone);
    return true;
  }
  if (YES_WORDS.has(w) && rec?.status === "pending" && !t.conv.state.flow) {
    await repo.saveOptIn({ ...rec, status: "opted_in", consentAt: t.deps.now(), stoppedAt: null });
    t.conv.locale ??= rec.locale;
    t.locale = t.conv.locale;
    say(t, COPY.optInThanks);
    return true;
  }
  return false;
}

async function route(t: Turn, timedOut: boolean): Promise<void> {
  const rid = t.input.replyId;
  if (await optInKeywords(t)) return;

  // Language: asked once, then remembered.
  if (rid?.startsWith("lang:")) {
    t.conv.locale = rid === "lang:hi" ? "hi" : "en";
    t.locale = t.conv.locale;
    say(t, COPY.languageSet);
    return showMenu(t);
  }
  if (!t.conv.locale) {
    t.conv.locale = "en";
    return chooseLanguage(t);
  }
  const w = words(t.input.text).join(" ");
  if (LANG_WORDS.has(w)) return chooseLanguage(t);

  // Approval card buttons work anywhere, even after a timeout.
  const card = rid ? /^ap:(yes|no|ask):(.+)$/.exec(rid) : null;
  if (card) return decide(t, card[1] as "yes" | "no" | "ask", card[2]);
  if (rid?.startsWith("ap:")) return showCard(t, rid.slice(3));
  if (rid === "h:human") return handoff(t, "Asked to talk to a person");

  const cmd = commandOf(t.input);
  if (timedOut && !cmd) return showMenu(t);
  if (cmd) {
    if (cmd === "menu") return showMenu(t);
    if (cmd === "help") return help(t);
    if (cmd === "human") return handoff(t, t.input.text ?? "Asked to talk to a person");
    return startFlow(t, cmd);
  }
  if (CANCEL_WORDS.has(w) || (rid === "c:no" && !t.conv.state.flow)) {
    resetFlow(t);
    say(t, COPY.cancelled);
    return showMenu(t, false);
  }

  const flow = t.conv.state.flow ? FLOWS[t.conv.state.flow] : undefined;
  if (flow) return flow.step(t);

  // Text or a photo from a coordinator outside any flow becomes a draft for review.
  // A coordinator "Approve"/"Reject"/"Ask" typed after a template: act on the only waiting item.
  const verb = DECISION_WORDS[w];
  if (verb && canApprove(t)) {
    const res = await t.deps.portal.approvals.list(t.actor!, { tab: "plans", page: 1, pageSize: 10 });
    const reports = await t.deps.portal.approvals.list(t.actor!, { tab: "reports", page: 1, pageSize: 10 });
    const all = [...res.data, ...reports.data];
    if (all.length === 1) return decide(t, verb, all[0].event.id);
    return startApprovals(t);
  }

  const open = await t.deps.repo.wa.openAskFor(t.conv.phoneHash);
  if (open && (t.input.text || t.input.media)) {
    await t.deps.ingest({ conversation: t.conv, actor: t.actor, text: t.input.text, media: t.input.media, note: `reply:${open.id}` });
    say(t, COPY.replyForwarded);
    return;
  }
  // Photos: coordinators start the gallery flow (it can hand them on to the review inbox); others are told why not.
  if (t.input.media?.kind === "image") return startGallery(t);
  const text = t.input.text?.trim() ?? "";
  if (isCoordinator(t) && (t.input.media || /\d/.test(text) || text.length > 40)) {
    await t.deps.ingest({ conversation: t.conv, actor: t.actor, text: t.input.text, media: t.input.media });
    say(t, COPY.sentToReview);
    return;
  }
  return unrecognised(t);
}

const toOutbound = (to: string, m: OutboundMessage, at: Date): WaOutbound => ({
  id: ulid(),
  to,
  at: at.toISOString(),
  kind: m.kind,
  text: m.text,
  buttons: m.buttons,
  list: m.list,
  template: null,
});

/** Handles one inbound message and sends the replies. Returns them (the dev simulator shows them). */
export async function handleInbound(deps: BotDeps, msg: InboundMessage): Promise<WaOutbound[]> {
  const digits = msg.from.replace(/\D/g, "");
  const e164 = normalisePhone(msg.from) ?? (digits.length >= 8 ? `+${digits}` : null);
  if (!e164) return [];
  const env = { secret: deps.secret, now: deps.now };
  const hash = phoneHash(deps.secret, e164);
  const user = await deps.repo.portal.userByPhoneHash(hash);
  const active = user && user.status !== "deactivated" ? user : null;
  const actor = active ? await deps.auth.actorFor(active.id) : null;
  const conv = await ensureConversation(deps.repo.wa, env, e164, actor ? active!.id : null);
  if (actor && active && !conv.locale) conv.locale = active.locale;

  let ingested: { id: string; mediaPath: string | null } | null = null;
  const wrapped: BotDeps = {
    ...deps,
    ingest: async (i) => {
      const item = await deps.ingest(i);
      ingested = { id: item.id, mediaPath: item.mediaPath };
      return item;
    },
  };
  const t: Turn = { deps: wrapped, conv, input: { text: msg.text, replyId: msg.replyId, media: msg.media }, user: actor ? active : null, actor, locale: conv.locale ?? "en", replies: [] };

  const now = deps.now();
  const timedOut = !!conv.state.flow && !!conv.expiresAt && now > conv.expiresAt;
  if (timedOut) {
    resetFlow(t);
    say(t, COPY.timeout);
  }
  try {
    await route(t, timedOut);
  } catch (err) {
    console.error("[bot] turn failed", err instanceof Error ? err.stack : err);
    t.replies.length = 0;
    resetFlow(t);
    say(t, COPY.trouble);
  }
  t.conv.expiresAt = t.conv.state.flow ? new Date((t.conv.state.flow === "answer" ? 24 * 60 * 60 * 1000 : FLOW_TIMEOUT_MS) + now.getTime()) : null;

  // Inbound first, so the log reads in order; conversation state is saved with it.
  const kind = msg.media ? (msg.media.kind === "pdf" ? "pdf" : "image") : "text";
  const a = ingested as { id: string; mediaPath: string | null } | null;
  await recordMessage(deps.repo.wa, env, t.conv, {
    dir: "in",
    kind,
    text: msg.text ?? (msg.replyId ? `[${msg.replyId}]` : null),
    payload: msg.replyId ? { replyId: msg.replyId } : null,
    providerId: msg.providerId ?? null,
    inboxItemId: a?.id ?? null,
    mediaName: msg.media?.name ?? null,
    mediaMime: msg.media?.mime ?? null,
    mediaPath: a?.mediaPath ?? null,
  });

  const out: WaOutbound[] = [];
  for (const r of t.replies) {
    out.push(toOutbound(e164, r, deps.now()));
    try {
      await deps.whatsapp.sendInteractive(e164, r, a ? { inboxItemId: a.id } : undefined);
    } catch (err) {
      console.error("[bot] reply failed", err instanceof Error ? err.message : err);
    }
  }
  return out;
}

