/**
 * Event-extract evals: runs the extractor over tests/evals/event-extract.cases.json
 * and scores every field (right / rightly empty / missed / invented / wrong).
 *   pnpm eval:events                         # rules only
 *   pnpm eval:events --hf                    # rules + HF_MODEL (fewshot prompt)
 *   pnpm eval:events --hf --variant=keys     # prompt variant: keys | skeleton | fewshot | schema
 *   pnpm eval:events --hf --model=onnx-community/LFM2-350M-Extract-ONNX --dtype=q4   # other model than HF_MODEL
 *   pnpm eval:events --hf --no-think          # Qwen3: append "/no_think" to the message
 *   pnpm eval:events --case=eye-fbd1-labelled --verbose
 *   pnpm eval:events --hf --out=docs/evals/event-extract-2026-10-27.md
 * Run model evals under a memory cap on small machines:
 *   systemd-run --user --scope -p MemoryMax=6G -p MemorySwapMax=0 pnpm eval:events --hf
 */
import { readFileSync, writeFileSync } from "node:fs";
import { EventExtract } from "@/contract";
import { extractEvent, type Generate, type PromptVariant } from "@/server/ai/event";
import { PROMPT_VARIANTS } from "@/server/ai/event/model";
import { SCORE_KEYS, scoreCase, totals, type EvalCase } from "@/server/ai/event/score";
import { loadHfModel } from "@/server/ai/hf";
import { env } from "@/server/env";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const useModel = args.includes("--hf");
const variant = (flag("variant") ?? "fewshot") as PromptVariant;
if (!PROMPT_VARIANTS.includes(variant)) throw new Error(`--variant must be one of ${PROMPT_VARIANTS.join(", ")}`);
const verbose = args.includes("--verbose");

const all = JSON.parse(readFileSync("tests/evals/event-extract.cases.json", "utf8")) as EvalCase[];
const only = flag("case");
const cases = all.filter((c) => !only || c.id === only).slice(0, Number(flag("limit") ?? all.length));

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

async function main() {
  const e = env();
  const stats = { calls: 0, ms: [] as number[], typeErrors: 0, ungrounded: 0, unparsed: 0, typeChecked: 0, used: 0 };
  let model: { generate: Generate; name: string; variant: PromptVariant } | undefined;
  const hfModel = flag("model") ?? e.HF_MODEL;
  const dtype = flag("dtype") ?? e.HF_DTYPE;
  const noThink = args.includes("--no-think");
  if (useModel) {
    const t0 = Date.now();
    const gen = await loadHfModel({ model: hfModel, dtype, cacheDir: e.HF_CACHE_DIR });
    console.error(`loaded ${hfModel} (${dtype}) in ${Date.now() - t0} ms`);
    const generate: Generate = async (m, n) => {
      const t = Date.now();
      const msgs = noThink ? m.map((x, i) => (i === m.length - 1 ? { ...x, content: `${x.content}\n/no_think` } : x)) : m;
      // A thinking model spends tokens on "<think></think>" first.
      const reply = await gen(msgs, noThink ? n + 16 : n);
      stats.calls += 1;
      stats.ms.push(Date.now() - t);
      if (verbose) console.error(`  reply: ${reply.replace(/\s+/g, " ").slice(0, 400)}`);
      return reply;
    };
    model = { generate, name: hfModel.split("/").at(-1)!, variant };
  }

  const scores = [];
  const lines: string[] = [];
  for (const c of cases) {
    const r = await extractEvent({ text: c.text, now: new Date(`${c.sentAt}T10:00:00+05:30`) }, model);
    // The type check of the whole result: what the app stores must parse.
    const parsed = EventExtract.safeParse(r);
    if (!parsed.success) console.error(`${c.id}: result fails EventExtract: ${parsed.error.message}`);
    else stats.typeChecked += 1;
    if (r.model !== "rules") stats.used += 1;
    for (const x of r.rejected) {
      if (x.field === "*") stats.unparsed += 1;
      else if (x.reason.startsWith("wrong type") || x.reason === "unknown key" || x.reason.startsWith("not a")) stats.typeErrors += 1;
      else stats.ungrounded += 1;
    }
    const s = scoreCase(r, c.expect);
    scores.push(s);
    const bad = SCORE_KEYS.filter((k) => s[k].outcome !== "ok" && s[k].outcome !== "none");
    const line = `${bad.length === 0 ? "✓" : "✗"} ${c.id}${bad.map((k) => `\n    ${k} ${s[k].outcome}: got ${JSON.stringify(s[k].got)} want ${JSON.stringify(s[k].want)}`).join("")}`;
    lines.push(line);
    if (verbose || bad.length) console.error(line);
    if (verbose && r.rejected.length) console.error(`    rejected: ${JSON.stringify(r.rejected)}`);
  }

  const t = totals(scores);
  const ms = [...stats.ms].sort((a, b) => a - b);
  const label = useModel ? `rules + ${hfModel} (${dtype}), prompt "${variant}"${noThink ? ", /no_think" : ""}` : "rules only";
  const report = [
    `# Event extract eval — ${label}`,
    "",
    `${t.cases} cases, ${SCORE_KEYS.length} fields each. Run ${new Date().toISOString().slice(0, 16)}Z.`,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Field accuracy | ${pct(t.accuracy)} |`,
    `| Hallucination (invented / should be empty) | ${pct(t.hallucination)} |`,
    `| Miss rate (empty / should have value) | ${pct(t.missRate)} |`,
    `| Wrong values | ${t.wrong} |`,
    `| Cases fully right | ${t.perfectCases}/${t.cases} |`,
    `| Results passing EventExtract | ${stats.typeChecked}/${t.cases} |`,
    ...(useModel
      ? [
          `| Model calls | ${stats.calls} (used in ${stats.used}) |`,
          `| Replies without JSON | ${stats.unparsed} |`,
          `| Model values failing type check | ${stats.typeErrors} |`,
          `| Model values not in the message | ${stats.ungrounded} |`,
          `| Latency p50 / p90 | ${ms[Math.floor(ms.length * 0.5)] ?? 0} / ${ms[Math.floor(ms.length * 0.9)] ?? 0} ms |`,
        ]
      : []),
    "",
    "| Field | ok | rightly empty | missed | invented | wrong |",
    "|---|---|---|---|---|---|",
    ...SCORE_KEYS.map((k) => {
      const f = t.byField[k];
      return `| ${k} | ${f.ok} | ${f.none} | ${f.miss} | ${f.extra} | ${f.wrong} |`;
    }),
    "",
    "<details><summary>Per case</summary>",
    "",
    "```",
    ...lines,
    "```",
    "</details>",
    "",
  ].join("\n");
  const out = flag("out");
  if (out) writeFileSync(out, report);
  console.log(report.split("<details>")[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
