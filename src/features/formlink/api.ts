// Form-link API calls (CONTRACT §5.2, v0.3). Cookie-authenticated mutations send
// the `csrf` cookie back as `x-csrf`; submissions carry the draft's Idempotency-Key.
import {
  type AnswerMap,
  type ApiErrorBody,
  type FormPayload,
  type LinkAttachment,
  type LinkInfo,
  type LinkSession,
  type OtpSent,
  type Submission,
  isErrorEnvelope,
  LINK_COOKIES,
  LINK_HEADERS,
  linkEndpoints,
} from "@/contract";
import { apiRequest, type ApiResult } from "@/lib/api";
import type { AppLocale } from "@/lib/format";

let csrfFromBody: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** The CSRF token to echo: the readable cookie, or the copy from the last verify/public answer. */
export const csrfToken = () => readCookie(LINK_COOKIES.csrf) ?? csrfFromBody ?? "";

const mutationHeaders = (extra: Record<string, string> = {}) => ({ [LINK_HEADERS.csrf]: csrfToken(), ...extra });

export function linkApi(token: string, locale: AppLocale) {
  const remember = (r: ApiResult<LinkSession>) => {
    if (r.ok && r.data.csrf) csrfFromBody = r.data.csrf;
    return r;
  };
  return {
    info: () => apiRequest<LinkInfo>(linkEndpoints.info(token), { locale }),
    sendOtp: (phone: string) => apiRequest<OtpSent>(linkEndpoints.otp(token), { method: "POST", body: { phone }, locale }),
    verify: async (phone: string, code: string) =>
      remember(await apiRequest<LinkSession>(linkEndpoints.verify(token), { method: "POST", body: { phone, code }, locale })),
    startPublic: async (botToken: string, website: string) =>
      remember(
        await apiRequest<LinkSession>(linkEndpoints.publicSession(token), {
          method: "POST",
          body: website ? { botToken, website } : { botToken },
          locale,
        }),
      ),
    form: () => apiRequest<FormPayload>(linkEndpoints.form(token), { locale }),
    create: (answers: AnswerMap, idempotencyKey: string) =>
      apiRequest<Submission>(linkEndpoints.submissions(token), {
        method: "POST",
        body: { answers },
        locale,
        headers: mutationHeaders({ [LINK_HEADERS.idempotencyKey]: idempotencyKey }),
      }),
    patch: (id: string, answers: AnswerMap, version: number) =>
      apiRequest<Submission>(linkEndpoints.submission(token, id), {
        method: "PATCH",
        body: { answers, version },
        locale,
        headers: mutationHeaders(),
      }),
    upload: (file: Blob, name: string, fieldId: string, idempotencyKey: string, onProgress?: (pct: number) => void) =>
      uploadWithProgress(linkEndpoints.attachments(token), file, name, fieldId, locale, mutationHeaders({ [LINK_HEADERS.idempotencyKey]: idempotencyKey }), onProgress),
  };
}

export type LinkApi = ReturnType<typeof linkApi>;

/** multipart upload through XHR, which (unlike fetch) reports upload progress. */
function uploadWithProgress(
  url: string,
  file: Blob,
  name: string,
  fieldId: string,
  locale: AppLocale,
  headers: Record<string, string>,
  onProgress?: (pct: number) => void,
): Promise<ApiResult<LinkAttachment>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.setRequestHeader("accept", "application/json");
    xhr.setRequestHeader("accept-language", locale);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    const fail = (status: number, error: ApiErrorBody) => resolve({ ok: false, status, error });
    xhr.onerror = () => fail(0, { code: "INTERNAL", message: "Network error" });
    xhr.ontimeout = () => fail(0, { code: "INTERNAL", message: "Timed out" });
    xhr.onload = () => {
      let json: unknown = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // handled below
      }
      if (xhr.status >= 200 && xhr.status < 300 && json && typeof json === "object" && "data" in json) {
        resolve({ ok: true, status: xhr.status, data: (json as { data: LinkAttachment }).data });
      } else if (isErrorEnvelope(json)) fail(xhr.status, json.error);
      else fail(xhr.status, { code: "INTERNAL", message: xhr.statusText || "Unexpected response" });
    };
    const fd = new FormData();
    fd.append("fieldId", fieldId);
    fd.append("file", file, name);
    xhr.send(fd);
  });
}
