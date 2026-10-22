// Query-string helpers shared by server pages and client islands.
export type Params = Record<string, string | string[] | undefined>;

/** `path?query` with `updates` applied (null/"" removes a key). Changing any filter resets the page unless `page` is given. */
export function hrefWith(path: string, current: Params, updates: Record<string, string | number | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) qs.set(k, s);
  }
  if (!("page" in updates)) qs.delete("page");
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === "") qs.delete(k);
    else qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
