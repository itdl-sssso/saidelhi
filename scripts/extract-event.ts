/**
 * Reads a WhatsApp event message with the extractor the app would use and prints the draft JSON.
 *   pnpm ai:event message.txt            # file
 *   pbpaste | pnpm ai:event -            # stdin
 *   pnpm ai:event message.txt --rules    # rules only, no model
 *   pnpm ai:event message.txt --now=2026-10-22   # read as if sent that day (IST noon)
 * Provider/model come from .env.local (EXTRACTOR_PROVIDER, HF_MODEL, HF_DTYPE, HF_CACHE_DIR);
 * `--hf` forces the Hugging Face model even when EXTRACTOR_PROVIDER=rules.
 */
import { readFileSync } from "node:fs";
import { EventExtract } from "@/contract";
import { createExtractor } from "@/server/ai";
import { env } from "@/server/env";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("usage: pnpm ai:event <file|-> [--rules|--hf]");
  process.exit(2);
}
const text = readFileSync(file === "-" ? 0 : file, "utf8");
const nowArg = args.find((a) => a.startsWith("--now="))?.slice(6);
const now = nowArg ? new Date(`${nowArg}T12:00:00+05:30`) : new Date();
const e = env();
const provider = args.includes("--rules") ? "rules" : args.includes("--hf") ? "hf" : e.EXTRACTOR_PROVIDER;
const extractor = createExtractor(provider, {
  ollama: { url: e.OLLAMA_URL, model: e.OLLAMA_MODEL },
  hf: { model: e.HF_MODEL, dtype: e.HF_DTYPE, cacheDir: e.HF_CACHE_DIR },
});

async function main() {
  const t0 = Date.now();
  const result = EventExtract.parse(await extractor.extractEvent({ text, now }));
  console.log(JSON.stringify(result, null, 2));
  console.error(`[${provider}] ${result.model} in ${Date.now() - t0} ms`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
