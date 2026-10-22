/** Deterministic 26-char ULID-shaped ids so mock and seeded data share stable ids. */
export const fx = (kind: string, n: number): string => `01JCSEED${kind.toUpperCase().padEnd(3, "X").slice(0, 3)}${String(n).padStart(15, "0")}`;
