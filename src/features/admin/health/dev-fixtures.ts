// TEMP M6 until backend merge — health fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const u = (id: string, en: string, hi: string) => ({ id, slug: id, name: { en, hi } });
const names: Array<[string, string, string]> = [["north", "North", "उत्तर"], ["south", "South", "दक्षिण"], ["west", "West", "पश्चिम"], ["east", "East", "पूर्व"], ["gurugram", "Gurugram", "गुरुग्राम"]];
registerFixtures(({ method, path, query }) => {
  if (path !== "/admin/health" || method !== "GET") return;
  const from = query.get("from") ?? "2026-05";
  const to = query.get("to") ?? "2026-10";
  const months: string[] = [];
  for (let [y, m] = from.split("-").map(Number); `${y}-${String(m).padStart(2, "0")}` <= to; m === 12 ? ((y += 1), (m = 1)) : (m += 1)) months.push(`${y}-${String(m).padStart(2, "0")}`);
  return {
    data: {
      scope: { id: "ncr", slug: "ncr", kind: "state", name: { en: "Delhi NCR", hi: "दिल्ली एनसीआर" } },
      months,
      tiles: [
        { key: "on_time_rate", label: { en: "Reports on time", hi: "समय पर रिपोर्ट" }, value: 78.4, unit: "pct", delta: 4.2, note: { en: "Within 7 days of the event", hi: null } },
        { key: "event_to_report_days", label: { en: "Days to report", hi: "रिपोर्ट में दिन" }, value: 4, unit: "days", delta: -1, note: null },
        { key: "waiting_approval", label: { en: "Waiting for approval", hi: "स्वीकृति की प्रतीक्षा" }, value: 7, unit: "count", delta: 2, note: null },
        { key: "estimate_share", label: { en: "Figures that are estimates", hi: "अनुमान वाले आँकड़े" }, value: 3.1, unit: "pct", delta: null, note: null },
      ],
      reportingRate: names.map(([slug, en, hi], i) => ({ unit: u(slug, en, hi), active: i !== 4, href: `/admin/events?district=${slug}&status=awaiting_report`, cells: months.map((_, j) => ((i + j) % 6 === 5 ? null : 40 + ((i * 17 + j * 23) % 61))) })),
      pendingApprovals: names.slice(0, 3).map(([slug, en, hi], i) => ({ unit: u(slug, en, hi), waiting: 4 - i, oldestDays: 9 - i * 3, href: `/admin/approvals?tab=reports&district=${slug}` })),
      reportLag: names.slice(0, 4).map(([slug, en, hi], i) => ({ unit: u(slug, en, hi), medianDays: 2 + i, slowestDays: 8 + i * 4, href: `/admin/events?district=${slug}&status=awaiting_report` })),
      uploads: { batches: 6, rowsLoaded: 212, rowsRejected: 14, rejectsByReason: [{ reason: "missing_value", count: 6 }, { reason: "bad_date", count: 5 }, { reason: "unknown_samithi", count: 3 }] },
      channelMix: [{ source: "form", count: 190, pct: 61 }, { source: "whatsapp", count: 70, pct: 22.5 }, { source: "upload", count: 40, pct: 12.9 }, { source: "scan", count: 11, pct: 3.6 }],
      estimateShare: { pct: 3.1, estimated: 12, total: 388 },
    },
  };
});
