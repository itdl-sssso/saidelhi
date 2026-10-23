// TEMP M6 until backend merge — settings fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

let settings = {
  flags: { discourses: false, offline_mode: true, ai_extraction: false },
  links: { reportLinkDays: 14, deskLink: "event_day", otpMaxAttempts: 5, otpLockMinutes: 10 },
  escalation: { approvalDays: 3 },
  analytics: { provider: "none", enabled: false, lastEventAt: null },
  version: 1,
};

const seva = [
  ["eye", "Eye camp", "नेत्र शिविर", "eye", "service", { id: "t1", title: { en: "Eye camp report", hi: "नेत्र शिविर रिपोर्ट" }, version: 3 }],
  ["medical", "Medical camp", "चिकित्सा शिविर", "stethoscope", "service", { id: "t2", title: { en: "Medical camp report", hi: null }, version: 2 }],
  ["narayan_seva", "Narayan Seva (food)", "नारायण सेवा (भोजन)", "utensils", "service", null],
  ["bal_vikas", "Bal Vikas class", "", "graduation-cap", "educational", null],
  ["bhajan", "Bhajans", "भजन", "music", "spiritual", null],
].map(([code, en, hi, icon, wing, template], i) => ({ code, label: { en, hi: hi || null }, icon, wing, active: i !== 4, sortOrder: i, template, version: 1 })) as Array<Record<string, unknown>>;

const kpis = [
  ["people_served", "People served", "derived", null, "Counts services given; one person may attend more than once."],
  ["spectacles_distributed", "Spectacles given", "sum", "eye", ""],
  ["meals_served", "Meals served", "sum", "narayan_seva", ""],
  ["volunteer_hours", "Volunteer hours", "derived", null, "Volunteers times hours each."],
].map(([key, en, how, sevaType, note]) => ({ key, label: { en, hi: null }, sevaType, how, formula: { en: `Sum of ${en} on approved reports`, hi: null }, publicImpact: key !== "volunteer_hours", homeTile: false, suppress: false, served: key === "people_served", note: note ? { en: note, hi: null } : null, icon: "heart", version: 1 })) as Array<Record<string, unknown>>;

const strings = [
  ["nav.getInvolved", "Get involved", "जुड़ें"],
  ["event.reportDue", "Report due in {n} days", ""],
  ["form.help.served", "Count each service given.", "हर दी गई सेवा गिनें।"],
  ["impact.estimateTip", "Rough figure from the district for years before the platform.", ""],
  ["wa.stopConfirm", "You won't get updates any more. Reply START to rejoin.", ""],
].map(([key, en, hi]) => ({ key, en, hi: hi || null, overridden: false })) as Array<Record<string, unknown>>;

registerFixtures(({ method, path, query, body }) => {
  const b = (body ?? {}) as Record<string, unknown>;
  if (path === "/admin/settings") {
    if (method === "PATCH") {
      const s = settings;
      settings = { ...s, flags: { ...s.flags, ...(b.flags as object) }, links: { ...s.links, ...(b.links as object) }, escalation: { ...s.escalation, ...(b.escalation as object) }, version: s.version + 1 };
    }
    return { data: settings };
  }
  if (path === "/admin/settings/seva-types") {
    if (method === "POST") {
      seva.push({ code: b.code, label: b.label, icon: b.icon, wing: b.wing, active: true, sortOrder: seva.length, template: null, version: 1 });
      return { status: 201, data: seva[seva.length - 1] };
    }
    return { data: seva, meta: { total: seva.length, page: 1, pageSize: 50 } };
  }
  let m = path.match(/^\/admin\/settings\/seva-types\/(\w+)$/);
  if (m) {
    const row = seva.find((r) => r.code === m![1]);
    if (!row) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
    Object.assign(row, b, { version: (row.version as number) + 1 });
    return { data: row };
  }
  if (path === "/admin/settings/kpis") return { data: kpis, meta: { total: kpis.length, page: 1, pageSize: 50 } };
  m = path.match(/^\/admin\/settings\/kpis\/(\w+)$/);
  if (m) {
    const row = kpis.find((r) => r.key === m![1]);
    if (!row) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
    Object.assign(row, b, { version: (row.version as number) + 1 });
    return { data: row };
  }
  if (path === "/admin/settings/strings") {
    if (method === "PATCH") {
      const row = strings.find((r) => r.key === b.key);
      if (!row) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
      const hi = b.hi as string | null | undefined;
      if (typeof hi === "string" && String(row.en).includes("{n}") && !hi.includes("{n}")) return { status: 422, data: { code: "VALIDATION", message: "Placeholders must match", fields: { [row.key as string]: "Keep {n} exactly as in English." } } };
      Object.assign(row, { ...(b.en !== undefined ? { en: b.en } : {}), ...(hi !== undefined ? { hi } : {}), overridden: true });
      return { data: row };
    }
    const q = (query.get("q") ?? "").toLowerCase();
    const rows = strings.filter((r) => (!q || `${r.key} ${r.en} ${r.hi}`.toLowerCase().includes(q)) && (query.get("missing") !== "true" || !r.hi));
    return { data: rows, meta: { total: rows.length, page: 1, pageSize: 25 } };
  }
  return undefined;
});
