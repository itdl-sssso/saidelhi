// TEMP M6 until backend merge — partners fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const rows: Array<Record<string, unknown>> = [
  ["Sankara Eye Hospital", "शंकर नेत्र चिकित्सालय", "hospital", "Gurugram", "Eye OPD in-charge", 4, true],
  ["Rotary Blood Bank", null, "blood_bank", "New Delhi", null, 2, true],
  ["Asha Foundation", "आशा फाउंडेशन", "ngo", "Noida", "Programme office", 1, false],
  ["Govt Girls School, Rohini", null, "school", "Delhi", null, 0, true],
].map(([name, nameHi, kind, city, contact, eventsThisYear, showPublicly], i) => ({ id: `p${i + 1}`, name, nameHi, kind, city, contact, showPublicly, active: true, eventsThisYear, version: 1 }));

registerFixtures(({ method, path, query, body }) => {
  const b = (body ?? {}) as Record<string, unknown>;
  if (path === "/admin/partners") {
    if (method === "POST") {
      rows.push({ id: `p${rows.length + 1}`, active: true, eventsThisYear: 0, version: 1, ...b });
      return { status: 201, data: rows[rows.length - 1] };
    }
    const q = (query.get("q") ?? "").toLowerCase();
    const kind = query.get("kind");
    const active = query.get("active") !== "false";
    const out = rows.filter((r) => (r.active as boolean) === active && (!kind || r.kind === kind) && (!q || String(r.name).toLowerCase().includes(q)));
    return { data: out, meta: { total: out.length, page: 1, pageSize: 25 } };
  }
  const m = path.match(/^\/admin\/partners\/(\w+)$/);
  if (m) {
    const row = rows.find((r) => r.id === m[1]);
    if (!row) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
    Object.assign(row, b, { version: (row.version as number) + 1 });
    return { data: row };
  }
});
