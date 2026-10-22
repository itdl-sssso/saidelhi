import { newId } from "../db/columns";
import type { OtpPurpose } from "../db/schema/forms";
import { devAllowedPhones, devLinks, SEED_EVENT_FORM_LOCKS, seedTemplates } from "../forms/seed-data";
import type { Fixtures } from "../mock/fixtures";
import type {
  AllowedPhoneRec,
  AttachmentRec,
  ConsentRec,
  FormVersionRec,
  LinkRec,
  LinkSessionRec,
  LinksRepo,
  NewSubmissionResult,
  NewSubmissionWrite,
  OtpRec,
  SubmissionRec,
  SubmissionScope,
  SubmissionUpdateWrite,
  TemplateRec,
} from "./links-types";
import type { ApprovalRec } from "./portal-types";

const latestFirst = (a: SubmissionRec, b: SubmissionRec) => b.submittedAt.getTime() - a.submittedAt.getTime();

/** In-memory LinksRepo seeded with the same templates and DEV links as `pnpm db:seed`. */
export class MemoryLinksRepo implements LinksRepo {
  readonly templateRecs: TemplateRec[];
  readonly versions: FormVersionRec[];
  readonly links: LinkRec[];
  readonly allowed: AllowedPhoneRec[];
  readonly otps: OtpRec[] = [];
  readonly sessions: LinkSessionRec[] = [];
  readonly submissions: SubmissionRec[] = [];
  readonly attachments: AttachmentRec[] = [];
  readonly consents: ConsentRec[] = [];
  /** Shared with MemoryPortalRepo (report submissions open an approval). */
  readonly approvals: ApprovalRec[] = [];
  /** created_at of links (the record type has none). */
  readonly linkCreatedAt = new Map<string, Date>();
  private readonly locks: Map<string, string>;

  constructor(
    private readonly fx: Fixtures,
    secret: string,
  ) {
    const { templates, versions } = seedTemplates();
    this.templateRecs = templates;
    this.versions = versions;
    this.links = devLinks(secret).map((l) => l.rec);
    this.allowed = devAllowedPhones(secret);
    this.locks = new Map(Object.entries(SEED_EVENT_FORM_LOCKS));
  }

  async templates() {
    return this.templateRecs;
  }

  async versionById(id: string) {
    return this.versions.find((v) => v.id === id) ?? null;
  }

  async publishedVersion(templateId: string) {
    const list = this.versions.filter((v) => v.templateId === templateId && v.status === "published").sort((a, b) => b.version - a.version);
    return list[0] ?? null;
  }

  async eventFormVersionId(eventId: string) {
    return this.locks.get(eventId) ?? null;
  }

  async lockEventFormVersion(eventId: string, versionId: string) {
    const cur = this.locks.get(eventId);
    if (cur) return cur;
    this.locks.set(eventId, versionId);
    return versionId;
  }

  async linkByTokenHash(hash: string) {
    return this.links.find((l) => l.tokenHash === hash) ?? null;
  }

  async linkById(id: string) {
    return this.links.find((l) => l.id === id) ?? null;
  }

  async linksForEvent(eventId: string) {
    return this.links.filter((l) => l.eventId === eventId);
  }

  async insertLink(rec: LinkRec) {
    this.links.push({ ...rec });
    this.linkCreatedAt.set(rec.id, new Date());
  }

  async updateLink(id: string, patch: Partial<Pick<LinkRec, "expiresAt" | "revokedAt" | "lastOpenedAt">>) {
    const l = this.links.find((x) => x.id === id);
    if (l) Object.assign(l, patch, { version: l.version + 1 });
  }

  async allowedPhone(eventId: string, phoneHash: string) {
    return this.allowed.find((a) => a.eventId === eventId && a.phoneHash === phoneHash) ?? null;
  }

  async addAllowedPhone(rec: AllowedPhoneRec) {
    if (!(await this.allowedPhone(rec.eventId, rec.phoneHash))) this.allowed.push(rec);
  }

  async latestOtp(phoneHash: string, purpose: OtpPurpose, linkId: string | null) {
    const list = this.otps.filter((o) => o.phoneHash === phoneHash && o.purpose === purpose && o.linkId === linkId);
    return list.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0] ?? null;
  }

  async countOtpsSince(phoneHash: string, since: Date) {
    return this.otps.filter((o) => o.phoneHash === phoneHash && o.sentAt >= since).length;
  }

  async insertOtp(rec: OtpRec) {
    this.otps.push({ ...rec });
  }

  async updateOtp(id: string, patch: Partial<Pick<OtpRec, "attempts" | "lockedUntil" | "consumedAt" | "expiresAt" | "sentAt">>) {
    const o = this.otps.find((x) => x.id === id);
    if (o) Object.assign(o, patch);
  }

  async insertSession(rec: LinkSessionRec) {
    this.sessions.push({ ...rec });
  }

  async sessionById(id: string) {
    return this.sessions.find((s) => s.id === id) ?? null;
  }

  async submissionById(id: string) {
    return this.submissions.find((s) => s.id === id) ?? null;
  }

  async submissionByIdempotencyKey(key: string) {
    return this.submissions.find((s) => s.idempotencyKey === key) ?? null;
  }

  async latestSubmission(scope: SubmissionScope) {
    const linkPurpose = new Map(this.links.map((l) => [l.id, l.purpose]));
    return (
      this.submissions
        .filter((s) => s.eventId === scope.eventId)
        .filter((s) => !scope.linkId || s.linkId === scope.linkId)
        .filter((s) => !scope.sessionId || s.sessionId === scope.sessionId)
        .filter((s) => !scope.purpose || (s.linkId !== null && linkPurpose.get(s.linkId) === scope.purpose))
        .sort(latestFirst)[0] ?? null
    );
  }

  async createSubmission(w: NewSubmissionWrite): Promise<NewSubmissionResult> {
    if (w.submission.idempotencyKey && (await this.submissionByIdempotencyKey(w.submission.idempotencyKey))) return "duplicate_key";
    const link = this.links.find((l) => l.id === w.linkId);
    if (!link || (link.maxUses !== null && link.uses >= link.maxUses)) return "used_up";
    link.uses += 1;
    this.submissions.push(structuredClone(w.submission));
    this.writeFacts(w.submission.eventId, w.submission.id, w.facts);
    this.consents.push(...w.consents);
    this.claimAttachments(w.attachmentIds, w.submission.id);
    this.moveEvent(w.submission.eventId, w.eventStatus);
    const ev = this.fx.events.find((e) => e.id === w.submission.eventId);
    if (ev) ev.volunteersJoined += w.volunteersJoinedDelta;
    return "ok";
  }

  async updateSubmission(w: SubmissionUpdateWrite): Promise<"ok" | "conflict"> {
    const s = this.submissions.find((x) => x.id === w.id);
    if (!s || s.version !== w.expectedVersion) return "conflict";
    Object.assign(s, { answers: w.answers, personalAnswers: w.personalAnswers, status: w.status, version: s.version + 1 });
    if (w.facts) {
      this.fx.kpiFacts = this.fx.kpiFacts.filter((f) => f.submissionId !== w.id);
      this.writeFacts(w.eventId, w.id, w.facts);
    }
    this.consents.splice(0, this.consents.length, ...this.consents.filter((c) => c.submissionId !== w.id), ...w.consents);
    this.claimAttachments(w.attachmentIds, w.id);
    this.moveEvent(w.eventId, w.eventStatus ?? null);
    return "ok";
  }

  private moveEvent(eventId: string, m: NewSubmissionWrite["eventStatus"]) {
    const ev = this.fx.events.find((e) => e.id === eventId);
    if (!ev || !m || !m.from.includes(ev.status)) return;
    ev.status = m.to;
    ev.version += 1;
    this.fx.timeline.push({ id: newId(), eventId: ev.id, ...m.timeline, note: null });
    if (m.approval) this.approvals.push({ ...m.approval });
  }

  async insertAttachment(rec: AttachmentRec) {
    this.attachments.push({ ...rec });
  }

  async attachmentsByIds(ids: readonly string[]) {
    return this.attachments.filter((a) => ids.includes(a.id));
  }

  async attachmentByIdempotencyKey(linkId: string, key: string) {
    return this.attachments.find((a) => a.linkId === linkId && a.idempotencyKey === key) ?? null;
  }

  private writeFacts(eventId: string, submissionId: string, facts: NewSubmissionWrite["facts"]) {
    for (const f of facts) {
      this.fx.kpiFacts.push({ id: newId(), eventId, submissionId, kpiKey: f.kpiKey, dim: f.dim, value: f.value, estimate: false, approvedAt: null });
    }
  }

  private claimAttachments(ids: readonly string[], submissionId: string) {
    for (const a of this.attachments) if (ids.includes(a.id)) a.submissionId = submissionId;
  }
}
