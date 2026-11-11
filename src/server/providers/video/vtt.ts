import { ApiError } from "../../http/errors";

const TIMING = /^(\d{1,2}:)?\d{1,2}:\d{2}[,.]\d{1,3}\s+-->\s+(\d{1,2}:)?\d{1,2}:\d{2}[,.]\d{1,3}/;

/**
 * SubRip (.srt) or WebVTT text -> WebVTT. Cue numbers are dropped and `,` in timestamps becomes `.`.
 * Throws a 422 on `file` when no cue is found.
 */
export function toVtt(input: string): string {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();
  const lines = text.split("\n");
  if (lines[0]?.startsWith("WEBVTT")) {
    if (!lines.some((l) => TIMING.test(l))) throw bad();
    return `${text}\n`;
  }
  const out: string[] = ["WEBVTT", ""];
  let cues = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (TIMING.test(line)) {
      cues++;
      out.push(line.replace(/(\d),(\d{1,3})/g, "$1.$2").replace(/\s+-->\s+/, " --> "));
    } else if (/^\d+$/.test(line.trim()) && TIMING.test(lines[i + 1] ?? "")) {
      // SRT cue number
    } else {
      out.push(line);
    }
  }
  if (cues === 0) throw bad();
  return `${out.join("\n")}\n`;
}

const bad = () => new ApiError("VALIDATION_FAILED", { fields: { file: "Not a valid .srt or .vtt caption file." } });
