/** Authenticated file download through fetch (the portal cookies are same-origin). */
export async function download(url: string, name: string) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return false;
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return true;
}

/** POST a JSON body and save the response file (CSV exports). A failed request returns the JSON error envelope. */
export async function downloadPost(url: string, body: unknown, name: string): Promise<{ ok: true } | { ok: false; status: number; message: string; fields?: Record<string, string> }> {
  const { PORTAL_HEADERS } = await import("@/contract");
  const { csrfToken } = await import("@/lib/portal-api");
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", [PORTAL_HEADERS.csrf]: csrfToken() }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, status: 0, message: "network" };
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => null)) as { error?: { message?: string; fields?: Record<string, string> } } | null;
    return { ok: false, status: res.status, message: j?.error?.message ?? res.statusText, fields: j?.error?.fields };
  }
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return { ok: true };
}
