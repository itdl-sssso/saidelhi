// Gallery intake by chat (spec 52): a coordinator's photo is stored as pending, then the bot asks
// which event or album it belongs to. More photos sent meanwhile join the same batch.
import type { Locale } from "@/contract";
import { can } from "../../auth/rbac";
import type { GalleryTarget } from "../../services/portal/gallery-types";
import { COPY, LABEL } from "./copy";
import { showMenu } from "./menu";
import { list, resetFlow, say, setStep } from "./reply";
import type { Flow, Turn } from "./types";

interface GalleryData {
  photoIds: string[];
  match?: { kind: "event" | "album"; id: string } | null;
}

const data = (t: Turn) => t.conv.state.data as unknown as GalleryData;
const loc = (t: Turn, v: { en: string; hi: string | null }) => (t.locale === "hi" ? v.hi : null) ?? v.en;

const day = (iso: string, l: Locale) => new Intl.DateTimeFormat(l === "hi" ? "hi-IN" : "en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00+05:30` : iso));

/** Stores the photo in `t.input.media`; replies with the reason and returns null when it cannot. */
async function take(t: Turn): Promise<string | null> {
  const m = t.input.media;
  if (!m?.bytes) {
    say(t, COPY.galleryNoBytes);
    return null;
  }
  const r = await t.deps.portal.gallery.intake({
    actor: t.actor!,
    bytes: m.bytes,
    name: m.name,
    caption: t.input.text,
    senderMasked: t.conv.phoneMasked,
    conversationId: t.conv.id,
  });
  if (r.ok) return r.photoId;
  say(t, r.reason === "too_large" ? COPY.galleryTooLarge : r.reason === "bad_type" ? COPY.galleryBadType : r.reason === "not_allowed" ? COPY.galleryOnlyCoordinators : COPY.trouble);
  return null;
}

async function ask(t: Turn): Promise<void> {
  const { match, options } = await t.deps.portal.gallery.targets(t.actor!);
  const d = data(t);
  d.match = match ? { kind: match.kind, id: match.id } : null;
  const rid = (o: GalleryTarget) => `g:${o.kind === "event" ? "e" : "a"}:${o.id}`;
  const rows = [
    ...(match ? [{ id: "g:y", title: `${t.locale === "hi" ? "हाँ" : "Yes"}, ${loc(t, match.title)}`, description: `${loc(t, match.title)} · ${day(match.date, t.locale)}` }] : []),
    ...options
      .filter((o) => !(match && o.kind === match.kind && o.id === match.id))
      .slice(0, 8)
      .map((o) => ({ id: rid(o), title: loc(t, o.title), description: day(o.date, t.locale) })),
    { id: "g:no", title: LABEL.galleryNone, description: LABEL.galleryNoneHint },
  ];
  list(t, match ? COPY.galleryAskMatch(loc(t, match.title)) : COPY.galleryAsk, LABEL.choose, rows, LABEL.galleryRecent);
}

/** A photo outside any flow from someone who may send photos (checked by the engine). */
export async function startGallery(t: Turn): Promise<void> {
  if (!t.actor || !can(t.actor, "gallery.upload")) return say(t, COPY.galleryOnlyCoordinators);
  const id = await take(t);
  if (!id) return;
  setStep(t, "gallery", "which", { photoIds: [id] } satisfies GalleryData as unknown as Record<string, unknown>);
  await ask(t);
}

async function step(t: Turn): Promise<void> {
  const d = data(t);
  if (t.input.media?.kind === "image") {
    const id = await take(t);
    if (id) {
      d.photoIds.push(id);
      say(t, COPY.galleryAdded(d.photoIds.length));
    }
    return;
  }
  const rid = t.input.replyId ?? "";
  const n = d.photoIds.length;
  if (rid === "g:no") {
    const files = await t.deps.portal.gallery.withdraw(t.actor!, d.photoIds);
    for (const f of files) await t.deps.ingest({ conversation: t.conv, actor: t.actor, text: f.caption, media: { kind: "image", name: f.name ?? "photo.jpg", bytes: f.bytes } });
    resetFlow(t);
    say(t, COPY.sentToReview);
    return showMenu(t, false);
  }
  const target = rid === "g:y" ? d.match : /^g:([ea]):(.+)$/.test(rid) ? { kind: rid[2] === "e" ? ("event" as const) : ("album" as const), id: rid.slice(4) } : null;
  if (!target) {
    say(t, COPY.galleryPick);
    return ask(t);
  }
  await t.deps.portal.gallery.assign(t.actor!, d.photoIds, target);
  resetFlow(t);
  say(t, COPY.galleryThanks(n));
  return showMenu(t, false);
}

export const galleryFlow: Flow = { start: async () => undefined, step };
