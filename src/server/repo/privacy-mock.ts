import type { MemoryLinksRepo } from "./links-mock";
import type { MemoryWaRepo } from "./wa-mock";
import type { InboxItemRec, WaMessageRec } from "./wa-types";
import type { ConsentRow, MediaRef, PersonalSubmission, PrivacyRepo, PrivacyRequestFull, PrivacyRequestPatchRec } from "./privacy-types";
import type { AuditRec, PrivacyRequestRec } from "./types";

interface WaInternals {
  msgs: WaMessageRec[];
  inbox: Map<string, InboxItemRec>;
  optins: Map<string, { id: string; status: string }>;
}

/** In-memory privacy desk over the mock request list and the other mock repos. */
export class MemoryPrivacyRepo implements PrivacyRepo {
  private readonly state = new Map<string, Omit<PrivacyRequestFull, keyof PrivacyRequestRec>>();
  private readonly deleted = new Set<string>();

  constructor(
    private readonly base: PrivacyRequestRec[],
    private readonly links: MemoryLinksRepo,
    private readonly wa: MemoryWaRepo,
    private readonly pushAudit: (rec: AuditRec) => Promise<void>,
  ) {}

  private get w() {
    return this.wa as unknown as WaInternals;
  }

  private full(r: PrivacyRequestRec): PrivacyRequestFull {
    let s = this.state.get(r.id);
    if (!s) this.state.set(r.id, (s = { status: "received", assigneeId: null, handledBy: null, closedAt: null, steps: [], version: 1, createdAt: new Date(r.dueAt.getTime() - 30 * 86_400_000) }));
    return { ...r, ...s, steps: [...s.steps] };
  }

  private async audit(a?: AuditRec[]) {
    for (const r of a ?? []) await this.pushAudit(r);
  }

  async requests() {
    return this.base.filter((r) => !this.deleted.has(r.id)).map((r) => this.full(r));
  }

  async requestById(id: string) {
    return (await this.requests()).find((r) => r.id === id) ?? null;
  }

  async updateRequest(id: string, patch: PrivacyRequestPatchRec, expectVersion: number, audit?: AuditRec[]) {
    const cur = await this.requestById(id);
    if (!cur || cur.version !== expectVersion) return "conflict" as const;
    const s = this.state.get(id)!;
    Object.assign(s, patch, { version: expectVersion + 1 });
    await this.audit(audit);
    return "ok" as const;
  }

  async deleteRequests(ids: readonly string[], audit?: AuditRec[]) {
    let n = 0;
    for (const id of ids) if (!this.deleted.has(id) && this.base.some((r) => r.id === id)) {
        this.deleted.add(id);
        n++;
      }
    await this.audit(audit);
    return n;
  }

  async personalSubmissions(): Promise<PersonalSubmission[]> {
    return this.links.submissions.flatMap((s) =>
      s.personalAnswers ? [{ id: s.id, eventId: s.eventId, linkId: s.linkId, submittedAt: s.submittedAt, personalAnswers: s.personalAnswers }] : [],
    );
  }

  async clearPersonal(ids: readonly string[], audit?: AuditRec[]) {
    let n = 0;
    for (const s of this.links.submissions) if (ids.includes(s.id) && s.personalAnswers) {
        s.personalAnswers = null;
        n++;
      }
    await this.audit(audit);
    return n;
  }

  async writePersonal(id: string, value: Record<string, unknown> | null, audit?: AuditRec[]) {
    const s = this.links.submissions.find((x) => x.id === id);
    if (s) s.personalAnswers = value;
    await this.audit(audit);
  }

  async deleteOptIn(id: string) {
    for (const [k, v] of this.w.optins) if (v.id === id) return this.w.optins.delete(k);
    return false;
  }

  async consentRows(): Promise<ConsentRow[]> {
    return this.links.consents.map((c) => {
      const sub = this.links.submissions.find((s) => s.id === c.submissionId);
      const ver = this.links.versions.find((v) => v.id === sub?.formVersionId);
      return { templateId: ver?.templateId ?? "unknown", purpose: c.purpose, givenAt: c.givenAt, withdrawnAt: null };
    });
  }

  async optinCounts() {
    const all = [...this.w.optins.values()];
    const n = (st: string) => all.filter((o) => o.status === st).length;
    return { optedIn: n("opted_in"), pending: n("pending"), stopped: n("stopped") };
  }

  private msgDue = (m: WaMessageRec, before: Date) => m.createdAt < before && (m.text !== null || m.payload !== null || !!m.mediaPath);

  async messagesDue(before: Date) {
    return this.w.msgs.filter((m) => this.msgDue(m, before)).length;
  }

  async scrubMessages(before: Date) {
    const due = this.w.msgs.filter((m) => this.msgDue(m, before));
    const media = due.flatMap((m) => (m.mediaPath ? [m.mediaPath] : []));
    for (const m of due) Object.assign(m, { text: null, payload: null, mediaPath: null, mediaName: null, mediaMime: null });
    return { count: due.length, media };
  }

  async inboxMediaDue(before: Date): Promise<MediaRef[]> {
    return [...this.w.inbox.values()].flatMap((i) => (i.state === "done" && i.receivedAt < before && i.mediaPath ? [{ id: i.id, path: i.mediaPath }] : []));
  }

  async clearInboxMedia(ids: readonly string[]) {
    for (const id of ids) {
      const i = this.w.inbox.get(id);
      if (i) Object.assign(i, { mediaPath: null, mediaName: null });
    }
  }

  async attachmentsDue(now: Date): Promise<MediaRef[]> {
    return this.links.attachments.filter((a) => a.retentionUntil < now).map((a) => ({ id: a.id, path: a.path }));
  }

  async deleteAttachments(ids: readonly string[]) {
    const set = new Set(ids);
    for (let i = this.links.attachments.length - 1; i >= 0; i--) if (set.has(this.links.attachments[i].id)) this.links.attachments.splice(i, 1);
  }

  async otpDue(before: Date) {
    return this.links.otps.filter((o) => (o.expiresAt < before || o.consumedAt) && o.sentAt < before).length;
  }

  async deleteOtp(before: Date) {
    const n = await this.otpDue(before);
    for (let i = this.links.otps.length - 1; i >= 0; i--) {
      const o = this.links.otps[i];
      if ((o.expiresAt < before || o.consumedAt) && o.sentAt < before) this.links.otps.splice(i, 1);
    }
    return n;
  }
}
