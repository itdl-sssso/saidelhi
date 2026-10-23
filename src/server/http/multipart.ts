import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { Locale } from "@/contract";
import { ApiError } from "./errors";
import { issuesToFields } from "./messages";

export interface MultipartFile {
  name: string;
  bytes: Uint8Array;
  /** Client-declared type: never trusted, only for logging. */
  declaredType: string;
}

/**
 * Reads a multipart body: one required `file` part plus text fields validated with `schema`.
 * `maxBytes` bounds the file; problems → 422 with `fields.file` / field names.
 */
export async function readMultipart<S extends z.ZodType>(req: NextRequest, schema: S, opts: { maxBytes: number; locale: Locale }): Promise<{ file: MultipartFile; fields: z.output<S> }> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data")) throw new ApiError("BAD_REQUEST", { message: "Expected multipart/form-data" });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError("BAD_REQUEST");
  }
  const part = form.get("file");
  if (!(part instanceof File)) throw new ApiError("VALIDATION_FAILED", { fields: { file: opts.locale === "hi" ? "फ़ाइल चुनें।" : "Choose a file." } });
  if (part.size > opts.maxBytes) throw new ApiError("VALIDATION_FAILED", { fields: { file: opts.locale === "hi" ? "फ़ाइल बहुत बड़ी है।" : "The file is too large." } });
  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (k !== "file" && typeof v === "string") raw[k] = v;
  const parsed = await schema.safeParseAsync(raw);
  if (!parsed.success) throw new ApiError("VALIDATION_FAILED", { fields: issuesToFields(parsed.error.issues, opts.locale) });
  return { file: { name: part.name, bytes: new Uint8Array(await part.arrayBuffer()), declaredType: part.type }, fields: parsed.data };
}
