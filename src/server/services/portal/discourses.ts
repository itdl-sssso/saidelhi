// Discourse translation workspace (spec 39): list, add to shortlist, per-paragraph edit, review, publish.
// Rules: edits never change the public page (it serves `published_snapshot`) until re-publish; approving
// a paragraph/discourse needs `discourses.review`; publishing needs `discourses.publish` and flag `discourses`.
import {
  type AdminDiscourseBlock,
  type AdminDiscourseDetail,
  type AdminDiscourseRow,
  type AdminDiscoursesMeta,
  type AdminDiscoursesQuery,
  type DiscourseAiDraftBody,
  type DiscourseActionBody,
  type DiscourseCreate,
  type DiscourseMediaPatch,
  type DiscoursePatch,
  type DiscourseReviewer,
  type DiscourseStatus,
  type GlossaryTerm,
  approveBlockers,
  glossaryIssues,
  publishBlockers,
  quoteMatches,
  QUOTES_MAX,
} from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan, can, ROLE_PERMISSIONS } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { adminMedia, buildSnapshot, parseIsoDate } from "../../domain/discourse";
import { toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { DiscourseBlockRec, DiscourseChange, DiscourseRec } from "../../repo/discourse-types";
import { loadSettings } from "../shared";
import type { PortalCtx } from "./shared";

export interface DiscoursesAdminService {
  list(actor: Actor, q: AdminDiscoursesQuery): Promise<{ data: AdminDiscourseRow[]; meta: AdminDiscoursesMeta }>;
  glossary(actor: Actor): Promise<GlossaryTerm[]>;
  get(actor: Actor, id: string): Promise<AdminDiscourseDetail>;
  create(actor: Actor, body: DiscourseCreate): Promise<AdminDiscourseDetail>;
  patch(actor: Actor, id: string, body: DiscoursePatch): Promise<AdminDiscourseDetail>;
  aiDraft(actor: Actor, id: string, body: DiscourseAiDraftBody): Promise<AdminDiscourseDetail>;
  sendReview(actor: Actor, id: string, body: DiscourseActionBody): Promise<AdminDiscourseDetail>;
  approve(actor: Actor, id: string, body: DiscourseActionBody): Promise<AdminDiscourseDetail>;
  publish(actor: Actor, id: string, body: DiscourseActionBody): Promise<AdminDiscourseDetail>;
  unpublish(actor: Actor, id: string, body: DiscourseActionBody): Promise<AdminDiscourseDetail>;
  /** v0.9: approve/hide/reorder one audio/video candidate (needs `discourses.review`). */
  setMedia(actor: Actor, id: string, mediaId: string, body: DiscourseMediaPatch): Promise<AdminDiscourseDetail>;
}

const STATUSES: DiscourseStatus[] = ["not_started", "ai_draft", "in_review", "approved", "published"];
const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const clean = (s: string | null | undefined) => (s?.trim() ? s.trim() : null);
const fail = (fields: Record<string, string>) => new ApiError("VALIDATION_FAILED", { fields });

function slugify(title: string, n: number): string {
  const s = fold(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return s || `discourse-${n}`;
}

/** Blank-line separated paragraphs; a `#` line is a heading. */
export function splitSource(text: string): { type: "heading" | "para"; en: string }[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith("#") ? { type: "heading" as const, en: p.replace(/^#+\s*/, "").trim() } : { type: "para" as const, en: p }))
    .filter((p) => p.en.length > 0);
}

export function createDiscoursesAdminService(ctx: PortalCtx): DiscoursesAdminService {
  const { repo, deps } = ctx;
  const flagOn = async () => (await loadSettings(repo)).flags.discourses;

  async function reviewers(): Promise<DiscourseReviewer[]> {
    const people = await repo.portal.people();
    return people
      .filter((p) => p.role && p.user.status !== "deactivated" && ROLE_PERMISSIONS[p.role.role].includes("discourses.review"))
      .map((p) => ({ id: p.user.id, name: p.user.name }));
  }

  async function names(): Promise<Map<string, DiscourseReviewer>> {
    return new Map((await repo.portal.people()).map((p) => [p.user.id, { id: p.user.id, name: p.user.name }]));
  }

  async function load(id: string, version?: number) {
    const found = await repo.discourses.byId(id);
    if (!found) throw new ApiError("NOT_FOUND");
    if (version !== undefined && found.rec.version !== version) throw new ApiError("CONFLICT");
    return found;
  }

  async function detail(actor: Actor, id: string): Promise<AdminDiscourseDetail> {
    const [{ rec, blocks }, glossary, on, revs, who, media] = await Promise.all([load(id), repo.discourses.glossary(), flagOn(), reviewers(), names(), repo.discourses.mediaFor(id)]);
    const dtoBlocks: AdminDiscourseBlock[] = blocks.map((b) => ({
      id: b.blockId,
      idx: b.idx,
      type: b.type,
      en: b.en,
      hi: b.hi,
      status: b.status,
      hasAiDraft: !!b.hiAi,
      glossaryIssues: glossaryIssues(b.en, b.hi, glossary),
    }));
    return {
      id: rec.id,
      n: rec.n,
      slug: rec.slug,
      title: { en: rec.titleEn, hi: rec.titleHi },
      why: { en: rec.whyEn, hi: rec.whyHi },
      meta: {
        collPrint: rec.collPrint,
        collOnline: rec.collOnline,
        date: rec.dateText,
        isoDate: rec.isoDate,
        place: rec.place,
        occasion: rec.occasion,
        sourceUrl: rec.sourceUrl,
        pdfUrl: rec.pdfUrl,
        retrieved: rec.retrieved,
      },
      themes: rec.themes,
      status: rec.status,
      reviewer: rec.reviewerId ? (who.get(rec.reviewerId) ?? null) : null,
      blocks: dtoBlocks,
      quotes: rec.quotes,
      notes: rec.notes,
      publishedAt: rec.publishedAt ? toIso(rec.publishedAt) : null,
      flagOn: on,
      publishBlockers: publishBlockers(rec.status, on),
      media: adminMedia(media),
      reviewers: revs,
      can: { edit: can(actor, "discourses.edit"), review: can(actor, "discourses.review"), publish: can(actor, "discourses.publish") },
      version: rec.version,
    };
  }

  async function validReviewer(id: string): Promise<void> {
    if (!(await reviewers()).some((r) => r.id === id)) throw fail({ reviewerId: "This person cannot review discourses." });
  }

  /** Moves an approved/published discourse back to in_review after a content edit. */
  const demote = (rec: DiscourseRec): Partial<DiscourseRec> => (rec.status === "approved" || rec.status === "published" ? { status: "in_review" } : {});

  async function write(actor: Actor, rec: DiscourseRec, change: DiscourseChange, action: string, data: Record<string, unknown>) {
    const res = await repo.discourses.update(rec.id, rec.version, change, [auditRec(actor, { action, entity: "discourse", entityId: rec.id, data: { n: rec.n, ...data } })]);
    if (res === "conflict") throw new ApiError("CONFLICT");
  }

  return {
    async list(actor, q) {
      assertCan(actor, "discourses.edit");
      const [rows, who, on] = await Promise.all([repo.discourses.adminRows(), names(), flagOn()]);
      const needle = q.q ? fold(q.q.replace(/^#/, "")) : null;
      const hit = rows
        .filter((r) => !q.theme || r.rec.themes.includes(q.theme))
        .filter((r) => !q.status || r.rec.status === q.status)
        .filter((r) => !q.reviewer || (q.reviewer === "none" ? r.rec.reviewerId === null : r.rec.reviewerId === q.reviewer))
        .filter(
          (r) =>
            !needle ||
            String(r.rec.n) === needle ||
            [r.rec.titleEn, r.rec.titleHi, r.rec.slug].some((t) => !!t && fold(t).includes(needle)),
        );
      const counts: Record<string, number> = { all: rows.length };
      for (const s of STATUSES) counts[s] = rows.filter((r) => r.rec.status === s).length;
      const data: AdminDiscourseRow[] = hit.slice((q.page - 1) * q.pageSize, q.page * q.pageSize).map(({ rec, counts: c }) => ({
        id: rec.id,
        n: rec.n,
        slug: rec.slug,
        title: { en: rec.titleEn, hi: rec.titleHi },
        coll: rec.collPrint,
        themes: rec.themes,
        status: rec.status,
        reviewer: rec.reviewerId ? (who.get(rec.reviewerId) ?? null) : null,
        blocks: c,
        updatedAt: toIso(rec.updatedAt),
      }));
      return {
        data,
        meta: { page: q.page, pageSize: q.pageSize, total: hit.length, counts, flagOn: on, published: rows.filter((r) => r.rec.publishedSnapshot).length },
      };
    },

    async glossary(actor) {
      assertCan(actor, "discourses.edit");
      return repo.discourses.glossary();
    },

    async get(actor, id) {
      assertCan(actor, "discourses.edit");
      return detail(actor, id);
    },

    async create(actor, body) {
      assertCan(actor, "discourses.edit");
      const parts = splitSource(body.sourceText);
      if (!parts.length) throw fail({ sourceText: "Paste the English text." });
      const n = (await repo.discourses.maxN()) + 1;
      const taken = await repo.discourses.slugs();
      const slug = body.slug ?? slugify(body.title.en, n);
      if (taken.has(slug)) throw fail({ slug: "This slug is already used." });
      const now = deps.now();
      const id = newId();
      const rec: DiscourseRec = {
        id,
        n,
        slug,
        titleEn: body.title.en,
        titleHi: clean(body.title.hi),
        whyEn: body.why.en,
        whyHi: clean(body.why.hi),
        collPrint: body.meta.collPrint,
        collOnline: clean(body.meta.collOnline),
        dateText: body.meta.date,
        isoDate: parseIsoDate(body.meta.date),
        place: body.meta.place,
        occasion: body.meta.occasion,
        sourceUrl: clean(body.meta.sourceUrl),
        pdfUrl: clean(body.meta.pdfUrl),
        retrieved: body.meta.retrieved ?? null,
        themes: body.themes,
        status: "not_started",
        reviewerId: null,
        notes: [],
        quotes: [],
        publishedAt: null,
        publishedSnapshot: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      const blocks: DiscourseBlockRec[] = parts.map((p, i) => ({ discourseId: id, blockId: `s${i + 1}`, idx: i + 1, type: p.type, en: p.en, hi: null, hiAi: null, status: "empty" }));
      const res = await repo.discourses.insert(rec, blocks, [auditRec(actor, { action: "discourse.create", entity: "discourse", entityId: id, data: { n, slug, blocks: blocks.length } })]);
      if (res === "duplicate") throw fail({ slug: "This slug is already used." });
      return detail(actor, id);
    },

    async patch(actor, id, body) {
      assertCan(actor, "discourses.edit");
      const { rec, blocks } = await load(id, body.version);
      const set: NonNullable<DiscourseChange["rec"]> = {};
      const changed: string[] = [];
      let content = false;

      if (body.title) {
        set.titleEn = body.title.en;
        set.titleHi = clean(body.title.hi);
        changed.push("title");
        content = true;
      }
      if (body.why) {
        set.whyEn = body.why.en;
        set.whyHi = clean(body.why.hi);
        changed.push("why");
        content = true;
      }
      if (body.meta) {
        const m = body.meta;
        if (m.collPrint !== undefined) set.collPrint = m.collPrint;
        if (m.collOnline !== undefined) set.collOnline = clean(m.collOnline);
        if (m.date !== undefined) {
          set.dateText = m.date;
          set.isoDate = parseIsoDate(m.date);
        }
        if (m.place !== undefined) set.place = m.place;
        if (m.occasion !== undefined) set.occasion = m.occasion;
        if (m.sourceUrl !== undefined) set.sourceUrl = clean(m.sourceUrl);
        if (m.pdfUrl !== undefined) set.pdfUrl = clean(m.pdfUrl);
        if (m.retrieved !== undefined) set.retrieved = m.retrieved;
        changed.push("meta");
        content = true;
      }
      if (body.themes) {
        set.themes = body.themes;
        changed.push("themes");
        content = true;
      }
      if (body.reviewerId !== undefined) {
        assertCan(actor, "discourses.review");
        if (body.reviewerId !== null) await validReviewer(body.reviewerId);
        if (body.reviewerId !== rec.reviewerId) {
          set.reviewerId = body.reviewerId;
          changed.push("reviewerId");
        }
      }

      const blockChanges: NonNullable<DiscourseChange["blocks"]> = [];
      const errors: Record<string, string> = {};
      (body.blocks ?? []).forEach((c, i) => {
        const cur = blocks.find((b) => b.blockId === c.id);
        if (!cur) {
          errors[`blocks.${i}`] = "Unknown paragraph.";
          return;
        }
        const hi = c.hi !== undefined ? clean(c.hi) : cur.hi;
        const hiChanged = c.hi !== undefined && hi !== cur.hi;
        let status = cur.status;
        if (c.status !== undefined) status = c.status;
        else if (hiChanged) status = hi ? "edited" : "empty";
        if (c.status === "approved") assertCan(actor, "discourses.review");
        if (status === "approved") {
          if (!hi) errors[`blocks.${i}`] = "Add the Hindi text before approving.";
        }
        if (status === "empty" && hi) errors[`blocks.${i}`] = "A paragraph with Hindi text cannot be empty.";
        if (hi === cur.hi && status === cur.status) return;
        blockChanges.push({ blockId: cur.blockId, ...(hiChanged ? { hi } : {}), status });
        if (hiChanged) content = true;
      });
      if (Object.keys(errors).length) throw fail(errors);

      if (body.quotes) {
        const qErr: Record<string, string> = {};
        if (body.quotes.length > QUOTES_MAX) qErr.quotes = `At most ${QUOTES_MAX} quotes.`;
        body.quotes.forEach((q, i) => {
          if (!quoteMatches(q, blocks.map((b) => ({ id: b.blockId, en: b.en })))) qErr[`quotes.${i}`] = "The quote must appear word for word in its paragraph.";
        });
        if (Object.keys(qErr).length) throw fail(qErr);
        set.quotes = body.quotes.map((q) => ({ en: q.en, hi: clean(q.hi), blockId: q.blockId }));
        changed.push("quotes");
        content = true;
      }

      if (!changed.length && !blockChanges.length) return detail(actor, id);
      if (content) Object.assign(set, demote(rec));
      await write(actor, rec, { rec: set, blocks: blockChanges }, "discourse.update", { fields: changed, blocks: blockChanges.map((b) => b.blockId), status: set.status ?? rec.status });
      return detail(actor, id);
    },

    async setMedia(actor, id, mediaId, body) {
      assertCan(actor, "discourses.review");
      const { rec } = await load(id);
      const change: { approved?: boolean; sort?: number } = {};
      if (body.approved !== undefined) change.approved = body.approved;
      if (body.sort !== undefined) change.sort = body.sort;
      const res = await repo.discourses.updateMedia(id, mediaId, change, [auditRec(actor, { action: "discourse.media", entity: "discourse", entityId: id, data: { n: rec.n, mediaId, ...change } })]);
      if (res === "missing") throw new ApiError("NOT_FOUND");
      return detail(actor, id);
    },

    async aiDraft(actor, id, body) {
      assertCan(actor, "discourses.edit");
      const { rec, blocks } = await load(id, body.version);
      const only = body.blockIds ? new Set(body.blockIds) : null;
      // Without an explicit list: only paragraphs that have no Hindi yet.
      const targets = blocks.filter((b) => b.hiAi && (only ? only.has(b.blockId) : b.status === "empty" || !b.hi));
      if (!targets.length) throw fail({ blocks: "No stored AI draft for these paragraphs." });
      const set: NonNullable<DiscourseChange["rec"]> = { ...demote(rec) };
      if (rec.status === "not_started") set.status = "ai_draft";
      await write(actor, rec, { rec: set, blocks: targets.map((b) => ({ blockId: b.blockId, hi: b.hiAi, status: "ai_draft" as const })) }, "discourse.ai_draft", { blocks: targets.map((b) => b.blockId) });
      return detail(actor, id);
    },

    async sendReview(actor, id, body) {
      assertCan(actor, "discourses.edit");
      const { rec } = await load(id, body.version);
      const reviewerId = body.reviewerId ?? rec.reviewerId;
      if (!reviewerId) throw fail({ reviewerId: "Choose a reviewer first." });
      await validReviewer(reviewerId);
      if (rec.status === "published") throw fail({ status: "Already published. Edit a paragraph to start a new review." });
      await write(actor, rec, { rec: { status: "in_review", reviewerId } }, "discourse.send_review", { reviewerId, from: rec.status });
      return detail(actor, id);
    },

    async approve(actor, id, body) {
      assertCan(actor, "discourses.review");
      const { rec, blocks } = await load(id, body.version);
      const blockers = approveBlockers({ blocks, quotes: rec.quotes });
      if (blockers.length) {
        const fields: Record<string, string> = {};
        if (blockers.includes("blocks")) fields.blocks = "Approve every paragraph first.";
        if (blockers.includes("quotes")) fields.quotes = "Choose 2 to 4 quotes.";
        throw fail(fields);
      }
      await write(actor, rec, { rec: { status: rec.publishedSnapshot && rec.status === "published" ? "published" : "approved" } }, "discourse.approve", { from: rec.status });
      return detail(actor, id);
    },

    async publish(actor, id, body) {
      assertCan(actor, "discourses.publish");
      const { rec, blocks } = await load(id, body.version);
      const [on] = await Promise.all([flagOn()]);
      const blockers = publishBlockers(rec.status, on);
      if (blockers.length) {
        const fields: Record<string, string> = {};
        if (blockers.includes("flag_off")) fields.flag_off = "The discourses feature is switched off.";
        if (blockers.includes("not_approved")) fields.not_approved = "Approve the discourse first.";
        throw fail(fields);
      }
      if (approveBlockers({ blocks, quotes: rec.quotes }).length) throw fail({ not_approved: "Approve the discourse first." });
      const now = deps.now();
      const next: DiscourseRec = { ...rec, status: "published" };
      await write(actor, rec, { rec: { status: "published", publishedAt: now, publishedSnapshot: buildSnapshot(next, blocks) } }, "discourse.publish", { republish: rec.publishedSnapshot !== null });
      deps.revalidate(["discourses"]);
      return detail(actor, id);
    },

    async unpublish(actor, id, body) {
      assertCan(actor, "discourses.publish");
      const { rec } = await load(id, body.version);
      if (!rec.publishedSnapshot) throw fail({ status: "This discourse is not published." });
      await write(actor, rec, { rec: { status: rec.status === "published" ? "approved" : rec.status, publishedAt: null, publishedSnapshot: null } }, "discourse.unpublish", { from: rec.status });
      deps.revalidate(["discourses"]);
      return detail(actor, id);
    },
  };
}
