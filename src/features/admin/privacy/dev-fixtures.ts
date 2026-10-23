// TEMP M6 until backend merge — privacy fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const hour = (n: number) => new Date(Date.now() + n * 3600000).toISOString();
const i18n = (en: string) => ({ en, hi: null });

type Match = { id: string; kind: string; label: string; at: string | null; erasable: boolean };
interface Req {
  id: string; ref: string; name: string; phone: string; type: string; receivedAt: string; dueAt: string; daysLeft: number; status: string; assignee: null; closedAt: string | null;
  details: string; locale: "en" | "hi"; matches: Match[] | null; steps: Record<string, string | null>; history: Array<{ at: string; by: string | null; action: string }>; can: { act: boolean }; version: number;
}
const reqs: Req[] = [
  ["r1", "PR-0142", "Sunita M.", "deletion", -12, "received"],
  ["r2", "PR-0141", "Rakesh J.", "access", -8, "in_progress"],
  ["r3", "PR-0133", "Neha V.", "deletion", -40, "done"],
].map(([id, ref, name, type, d, status]) => ({
  id: id as string, ref: ref as string, name: name as string, phone: "+91 98••• ••210", type: type as string, receivedAt: day(d as number), dueAt: day((d as number) + 30), daysLeft: 30 + (d as number), status: status as string, assignee: null,
  closedAt: status === "done" ? day(-20) : null, details: "Please remove everything you hold about me.", locale: "en" as const, matches: null,
  steps: { found: null, exported: null, erased: null, replied: status === "done" ? day(-20) : null }, history: [{ at: day(d as number), by: null, action: "Request received from the public form" }], can: { act: true }, version: 1,
}));
const matches: Match[] = [
  { id: "m1", kind: "volunteer_signup", label: "Eye camp at Rohini", at: day(-9), erasable: true },
  { id: "m2", kind: "whatsapp_optin", label: "Opted in", at: day(-30), erasable: true },
  { id: "m3", kind: "followup", label: "Cataract follow-up", at: day(-14), erasable: true },
];
const jobs = (
  [["volunteer_signups", "Event + 30 days", 41, 3], ["whatsapp_messages", "30 days", 1208, 90], ["followup", "1 year after last contact", 6, 1], ["privacy_requests", "1 year after closing", 0, 0], ["otp", "10 minutes", null, 0]] as Array<[string, string, number | null, number]>
).map(([key, kept, del, due]) => ({ key, keptFor: i18n(kept), lastRunAt: day(-4), lastDeleted: del, nextRunAt: day(1), due, enabled: true, locked: key === "otp" }));
const breaches = [
  { id: "b1", ref: "BR-003", title: "Follow-up sheet shared in a WhatsApp group", details: "Photo of the list was posted in a group of 40 people.", discoveredAt: hour(-21), deadlineAt: hour(51), status: "open", affected: 14, steps: [{ key: "contain", doneAt: hour(-20), by: "State Admin", note: "Message deleted." }], createdBy: "State Admin", closedAt: null, version: 1 },
  { id: "b2", ref: "BR-002", title: "Wrong sheet emailed", details: "", discoveredAt: day(-110), deadlineAt: day(-107), status: "closed", affected: 2, steps: [], createdBy: "State Admin", closedAt: day(-100), version: 3 },
] as Array<Record<string, unknown> & { id: string; steps: Array<Record<string, unknown>>; version: number }>;
let dpo: { name: string | null; contact: string | null } = { name: null, contact: null };
const ov = () => ({ dpo, counts: { openRequests: reqs.filter((r) => r.status === "received" || r.status === "in_progress").length, overdueRequests: 0, openBreaches: breaches.filter((b) => b.status === "open").length }, can: { manage: true, editDpo: true } });
const bump = (r: { version: number }) => void (r.version += 1);

registerFixtures(({ method, path, body }) => {
  if (path === "/admin/privacy" && method === "GET") return { data: ov() };
  if (path === "/admin/privacy/dpo" && method === "PATCH") {
    dpo = body as typeof dpo;
    return { data: dpo };
  }
  if (path === "/admin/privacy/requests" && method === "GET") return { data: reqs.map((r) => ({ id: r.id, ref: r.ref, name: r.name, phone: r.phone, type: r.type, receivedAt: r.receivedAt, dueAt: r.dueAt, daysLeft: r.daysLeft, status: r.status, assignee: r.assignee, closedAt: r.closedAt })), meta: { total: reqs.length, page: 1, pageSize: 15 } };
  const m = path.match(/^\/admin\/privacy\/requests\/(\w+)(?:\/(find|erase|reply|export\.json))?$/);
  if (m) {
    const r = reqs.find((x) => x.id === m[1]);
    if (!r) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
    const now = new Date().toISOString();
    if (m[2] === "export.json") return { raw: { text: JSON.stringify({ ref: r.ref, matches: r.matches }, null, 2), type: "application/json" } };
    if (m[2] === "find") {
      r.matches = r.steps.erased ? [] : [...matches];
      r.steps.found = now;
      r.status = "in_progress";
      r.history.unshift({ at: now, by: "You", action: "Searched for the person's data" });
    } else if (m[2] === "erase") {
      const ids = (body as { matchIds: string[] }).matchIds;
      r.matches = (r.matches ?? []).filter((x) => !ids.includes(x.id));
      r.steps.erased = now;
      r.history.unshift({ at: now, by: "You", action: `Deleted ${ids.length} records` });
    } else if (m[2] === "reply") {
      r.steps.replied = now;
      r.status = "done";
      r.closedAt = now;
      r.history.unshift({ at: now, by: "You", action: "Replied by WhatsApp" });
    } else if (method === "PATCH") r.status = (body as { status: string }).status;
    if (method !== "GET") bump(r);
    return { data: r };
  }
  if (path === "/admin/privacy/consents") {
    return { data: { byForm: [{ templateId: "t1", form: i18n("Eye camp report"), purpose: "Follow-up call", given: 86, withdrawn: 2, lastAt: day(-1) }], whatsappOptins: { optedIn: 312, pending: 14, stopped: 9 }, recentWithdrawals: [{ at: day(-3), form: i18n("Eye camp report"), purpose: "Follow-up call" }] } };
  }
  if (path === "/admin/privacy/retention" && method === "GET") return { data: jobs };
  const rj = path.match(/^\/admin\/privacy\/retention\/(\w+)$/);
  if (rj && method === "PATCH") {
    const j = jobs.find((x) => x.key === rj[1]);
    if (j) j.enabled = (body as { enabled: boolean }).enabled;
    return { data: j };
  }
  if (path === "/admin/privacy/breaches" && method === "GET") return { data: breaches };
  if (path === "/admin/privacy/breaches" && method === "POST") {
    const b = body as { title: string; details?: string };
    const nb = { id: `b${breaches.length + 1}`, ref: `BR-00${breaches.length + 2}`, title: b.title, details: b.details ?? "", discoveredAt: hour(0), deadlineAt: hour(72), status: "open", affected: null, steps: [], createdBy: "You", closedAt: null, version: 1 };
    breaches.unshift(nb);
    return { status: 201, data: nb };
  }
  const bm = path.match(/^\/admin\/privacy\/breaches\/(\w+)$/);
  if (bm && method === "PATCH") {
    const b = breaches.find((x) => x.id === bm[1]);
    if (!b) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
    const pb = body as { step?: { key: string; done: boolean; note?: string }; affected?: number | null; status?: string };
    if (pb.step) {
      b.steps = b.steps.filter((s) => s.key !== pb.step!.key);
      if (pb.step.done) b.steps.push({ key: pb.step.key, doneAt: new Date().toISOString(), by: "You", note: pb.step.note ?? null });
    }
    if (pb.affected !== undefined) b.affected = pb.affected;
    if (pb.status) b.status = pb.status;
    bump(b);
    return { data: b };
  }
});
