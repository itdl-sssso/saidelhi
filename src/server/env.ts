import "server-only";
import { z } from "zod";
import { DEV_SESSION_SECRET } from "./security/crypto";

const blank = (v: unknown) => (v === "" ? undefined : v);
const optStr = z.preprocess(blank, z.string().optional());

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATA_SOURCE: z.preprocess(blank, z.enum(["mock", "db"]).default("mock")),
    DATABASE_URL: z.preprocess(blank, z.url({ protocol: /^mysql$/ }).optional()),
    MEDIA_ROOT: z.preprocess(blank, z.string().default("./media")),
    MEDIA_PRIVATE_ROOT: z.preprocess(blank, z.string().default("./media-private")),
    MEDIA_URL: z.preprocess(blank, z.string().default("/media")),
    /** Public origin used to build form-link URLs. */
    APP_URL: z.preprocess(blank, z.url().default("http://localhost:3000")),
    SESSION_SECRET: z.preprocess(blank, z.string().min(32).optional()),
    CRON_SECRET: optStr,
    WHATSAPP_PROVIDER: z.preprocess(blank, z.enum(["console", "cloud"]).default("console")),
    WA_PHONE_NUMBER_ID: optStr,
    WA_BUSINESS_ACCOUNT_ID: optStr,
    WA_ACCESS_TOKEN: optStr,
    WA_APP_SECRET: optStr,
    WA_VERIFY_TOKEN: optStr,
    /** Public number shown on /admin/whatsapp (E.164); display only. */
    WA_DISPLAY_NUMBER: optStr,
    /** Note on the status tab: the number also runs in the WhatsApp Business app. */
    /** Public bot number shown on /join (display format ok). Falls back to WA_DISPLAY_NUMBER, then a dev placeholder. */
    WHATSAPP_PUBLIC_NUMBER: optStr,
    /** Word visitors send to start the join flow. */
    WHATSAPP_PUBLIC_KEYWORD: z.preprocess(blank, z.string().default("JOIN")),
    WA_COEXISTENCE: z.preprocess(blank, z.enum(["true", "false"]).default("false").transform((v) => v === "true")),
    WA_GRAPH_VERSION: z.preprocess(blank, z.string().default("v23.0")),
    EXTRACTOR_PROVIDER: z.preprocess(blank, z.enum(["rules", "ollama", "hf"]).default("rules")),
    OLLAMA_URL: z.preprocess(blank, z.url().default("http://127.0.0.1:11434")),
    OLLAMA_MODEL: z.preprocess(blank, z.string().default("smollm2:1.7b")),
    /** EXTRACTOR_PROVIDER=hf: ONNX chat model run in-process by transformers.js (downloaded once from the Hub). */
    HF_MODEL: z.preprocess(blank, z.string().default("onnx-community/LFM2.5-350M-ONNX")),
    HF_DTYPE: z.preprocess(blank, z.enum(["q4", "q4f16", "q8", "int8", "uint8", "fp16", "fp32"]).default("q4")),
    /** Weights cache (relative to the app dir); kept outside node_modules so reinstalls do not re-download. */
    HF_CACHE_DIR: z.preprocess(blank, z.string().default(".cache/huggingface")),
  })
  .superRefine((env, ctx) => {
    if (env.DATA_SOURCE === "db" && !env.DATABASE_URL) {
      ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "required when DATA_SOURCE=db" });
    }
    if (env.WHATSAPP_PROVIDER === "cloud") {
      for (const k of ["WA_PHONE_NUMBER_ID", "WA_ACCESS_TOKEN", "WA_APP_SECRET", "WA_VERIFY_TOKEN"] as const) {
        if (!env[k]) ctx.addIssue({ code: "custom", path: [k], message: "required when WHATSAPP_PROVIDER=cloud" });
      }
    }
    if (env.NODE_ENV === "production" && !env.SESSION_SECRET) {
      ctx.addIssue({ code: "custom", path: ["SESSION_SECRET"], message: "required in production" });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Validated server environment. Throws with every problem listed on first use. */
export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

/** Root secret for keyed hashes, link tokens, CSRF and field encryption. */
export function appSecret(): string {
  const e = env();
  if (e.SESSION_SECRET) return e.SESSION_SECRET;
  if (e.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production");
  return DEV_SESSION_SECRET;
}

/** For tests only. */
export function resetEnvCache(): void {
  cached = undefined;
}
