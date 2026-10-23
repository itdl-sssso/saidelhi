// Reads an uploaded .xlsx/.csv into plain rows: header → text, with dates and
// numbers kept in a form the upload parser can interpret.
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { REPORT_SHEET } from "./template";

export interface SheetCell {
  /** Display text ("" when blank). Dates render as dd/mm/yyyy. */
  text: string;
  /** Numeric value when the cell holds a number (Excel serial dates arrive here). */
  num: number | null;
  /** Set when the cell holds a real date. */
  date: Date | null;
}

export interface ParsedSheet {
  headers: string[];
  /** 1-based sheet row numbers with their cells (blank rows removed). */
  rows: { row: number; cells: Map<string, SheetCell> }[];
  /** Total data rows scanned (including blank ones that were dropped). */
  scanned: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;

function toCell(v: ExcelJS.CellValue): SheetCell {
  if (v === null || v === undefined) return { text: "", num: null, date: null };
  if (v instanceof Date) return { text: fmtDate(v), num: null, date: v };
  if (typeof v === "number") return { text: String(v), num: v, date: null };
  if (typeof v === "boolean") return { text: v ? "yes" : "no", num: null, date: null };
  if (typeof v === "string") return { text: v.trim(), num: null, date: null };
  if (typeof v === "object") {
    if ("result" in v && v.result !== undefined) return toCell(v.result as ExcelJS.CellValue);
    if ("richText" in v) return { text: v.richText.map((t) => t.text).join("").trim(), num: null, date: null };
    if ("text" in v && typeof v.text === "string") return { text: v.text.trim(), num: null, date: null };
    if ("error" in v) return { text: "", num: null, date: null };
  }
  return { text: "", num: null, date: null };
}

export class SheetError extends Error {}

export async function readSheet(bytes: Uint8Array, ext: ".xlsx" | ".csv", maxRows: number): Promise<ParsedSheet> {
  const wb = new ExcelJS.Workbook();
  let ws: ExcelJS.Worksheet | undefined;
  try {
    if (ext === ".csv") {
      let buf = Buffer.from(bytes);
      if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) buf = buf.subarray(3);
      ws = await wb.csv.read(Readable.from(buf));
    } else {
      await wb.xlsx.load(Buffer.from(bytes) as never);
      ws = wb.getWorksheet(REPORT_SHEET) ?? wb.worksheets.find((s) => s.state === "visible") ?? wb.worksheets[0];
    }
  } catch {
    throw new SheetError("unreadable");
  }
  if (!ws) throw new SheetError("unreadable");
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  for (let c = 1; c <= Math.max(ws.columnCount, headerRow.cellCount); c++) {
    headers.push(toCell(headerRow.getCell(c).value).text.replace(/^﻿/, "").trim().toLowerCase());
  }
  const rows: ParsedSheet["rows"] = [];
  const last = ws.rowCount;
  if (last - 1 > maxRows + 200) throw new SheetError("too_many_rows");
  let scanned = 0;
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r);
    const cells = new Map<string, SheetCell>();
    let any = false;
    headers.forEach((h, i) => {
      if (!h) return;
      const cell = toCell(row.getCell(i + 1).value);
      cells.set(h, cell);
      if (cell.text !== "" && h !== "samithi_code") any = true;
    });
    scanned++;
    if (any) rows.push({ row: r, cells });
  }
  if (rows.length > maxRows) throw new SheetError("too_many_rows");
  return { headers: headers.filter(Boolean), rows, scanned };
}
