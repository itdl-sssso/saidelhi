# Event extract — model comparison (27 Oct 2026)

45 cases × 21 fields (`tests/evals/event-extract.cases.json`), rules first, model asked only for empty cued fields (33 calls), same type check + grounding for all. All q4 ONNX via transformers.js on the dev box (CPU), 5 GB memory cap. Reports per run in this folder.

| Model (q4 download) | Prompt | Field accuracy | Invented | Missed | Cases perfect | Model value kept in | p50 / p90 per call |
|---|---|---|---|---|---|---|---|
| rules only | – | 90.5% | 1.4% | 15.8% | 14 | – | – |
| **LFM2.5-350M (280 MB, default)** | fewshot | **91.2%** | 1.7% | 12.9% | 15 | 13 | **1.2 / 2.1 s** |
| SmolLM2-360M-Instruct (~400 MB, previous default) | fewshot | 91.1% | 1.4% | 13.7% | 15 | 9 | 2.1 / 6.0 s |
| granite-4.0-350m (548 MB) | schema | 90.9% | 1.9% | 12.6% | 14 | 16 | 1.7 / 2.9 s |
| Qwen3-0.6B, /no_think (876 MB) | schema | 90.8% | 2.4% | 12.1% | 16 | 19 | 6.0 / 9.6 s |
| Qwen2.5-0.5B-Instruct (749 MB) | either | 90.7% | 2.1–2.3% | 12.6–13.1% | 14 | 14–15 | 2.4 / 4.5 s |
| LFM2-350M-Extract (458 MB) | fewshot | 90.7% | 1.4% | 14.7% | 14 | 3 | 2.9 / 4.1 s |
| gemma-3-270m-it (307 MB) | schema | 90.7% | 1.4% | 14.7% | 14 | 6 | 2.4 / 4.6 s |
| LFM2-1.2B-Extract (1.16 GB) | schema | 90.5% | 2.4% | 11.5% | 14 | 18 | 4.2 / 5.8 s |
| LFM2.5-350M | schema | 90.3% | 2.6% | 11.8% | 14 | 20 | 1.3 / 2.0 s |
| LFM2-350M-Extract | schema | 90.2% | 2.8% | 13.1% | 14 | 19 | 1.6 / 2.9 s |

Notes
- Spread is 1 point (≈10 of 945 fields): the rules carry the score; models fill a few gaps and grounding throws most of their output away. More fields filled (schema prompt, bigger models) came with more invented values.
- Extract-tuned LFM2 models did not beat general ones here: messages are Hinglish/Devanagari (not in their language list) and the grounding rejects paraphrases.
- gemma-3-270m `fewshot` segfaulted in onnxruntime mid-run (exit 139); `schema` ran fine.
- Licences: SmolLM2, Qwen2.5, granite Apache-2.0; LFM2/LFM2.5 "LFM Open License v1.0" (free under a revenue threshold — check before production); gemma Gemma terms; Qwen3 Apache-2.0.
