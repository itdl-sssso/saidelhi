// Shipped UI strings (messages/*.json) flattened to dotted keys, plus ICU
// placeholder extraction for the override editor (settings, spec 49).
import en from "../../../messages/en.json";
import hi from "../../../messages/hi.json";

export type Flat = Record<string, string>;

function flatten(node: unknown, prefix: string, out: Flat): Flat {
  if (typeof node === "string") {
    out[prefix] = node;
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

let cached: { en: Flat; hi: Flat } | undefined;

export function shippedMessages(): { en: Flat; hi: Flat } {
  cached ??= { en: flatten(en, "", {}), hi: flatten(hi, "", {}) };
  return cached;
}

/**
 * Argument names an ICU message uses (`{n}`, `{n, plural, …}`, `{gender, select, …}`).
 * Nested branch bodies like `{# items}` are not arguments. Sorted, unique.
 */
export function placeholders(message: string): string[] {
  const names = new Set<string>();
  for (const m of message.matchAll(/\{\s*([A-Za-z_][\w]*)\s*(?:,|\})/g)) names.add(m[1]);
  return [...names].sort();
}

export const samePlaceholders = (a: string, b: string) => placeholders(a).join("|") === placeholders(b).join("|");

/** Rebuilds a nested object from dotted keys (what next-intl messages look like). */
export function unflatten(flat: Flat): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let node = root;
    for (const p of parts.slice(0, -1)) {
      const next = node[p];
      node = typeof next === "object" && next !== null ? (next as Record<string, unknown>) : (node[p] = {});
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}
