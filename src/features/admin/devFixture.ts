// DEV-ONLY SHIM (M4 frontend track): while the M4 backend is not merged, an /api/v1 route that does
// not exist answers Next's HTML 404 (mapped to code INTERNAL, status 404). In development only, the
// pages then fall back to typed fixtures so the UI can be reviewed. A real contract NOT_FOUND (JSON
// envelope) is never masked. Remove with the __fixtures__ folders after integration:
// grep for "devFixture".

export const isMissingRoute = (res: { ok: boolean; status: number; error?: { code: string } }): boolean =>
  process.env.NODE_ENV === "development" && !res.ok && (res.status === 501 || (res.status === 404 && res.error?.code === "INTERNAL"));
