// Excel template for a report form: header row = `excelColumns(def)` (the upload
// parser matches on it), a Help sheet with plain labels in both languages and a
// hidden Lists sheet feeding drop-downs.
import ExcelJS from "exceljs";
import { excelColumns, type FormDefinition, type FormField } from "@/contract";

export const REPORT_SHEET = "Report";
const PREFILL_ROWS = 50;
const VALIDATED_ROWS = 500;

const colLetter = (n: number): string => {
  let s = "";
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

function fieldOf(def: FormDefinition, id: string): FormField | undefined {
  for (const s of def.sections) for (const f of s.fields) if (f.id === id) return f;
  return undefined;
}

export async function buildTemplateXlsx(def: FormDefinition, opts: { samithiCode?: string | null } = {}): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SSSSO Delhi NCR";
  const cols = excelColumns(def);
  const ws = wb.addWorksheet(REPORT_SHEET, { views: [{ state: "frozen", ySplit: 1 }] });
  const help = wb.addWorksheet("Help");
  const lists = wb.addWorksheet("Lists", { state: "hidden" });

  help.addRow(["Column", "What to enter (English)", "क्या लिखें (हिन्दी)", "Type", "Required", "Allowed values / limits"]).font = { bold: true };
  let listCol = 0;

  cols.forEach((c, i) => {
    const n = i + 1;
    const f = fieldOf(def, c.fieldId);
    const head = ws.getCell(1, n);
    head.value = c.header;
    head.font = { bold: true };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.locked ? "FFD9D9D9" : "FFFFF2CC" } };
    ws.getColumn(n).width = Math.max(14, c.header.length + 4);

    let allowed = "";
    let validation: ExcelJS.DataValidation | null = null;
    if (c.header === "samithi_code" && opts.samithiCode) {
      for (let r = 2; r <= PREFILL_ROWS + 1; r++) ws.getCell(r, n).value = opts.samithiCode;
    }
    if (f?.kind === "select" || f?.kind === "multiselect") {
      listCol++;
      (f.options ?? []).forEach((o, k) => {
        lists.getCell(k + 1, listCol).value = o.value;
      });
      const rng = `Lists!$${colLetter(listCol)}$1:$${colLetter(listCol)}$${Math.max(1, f.options?.length ?? 1)}`;
      if (f.kind === "select") validation = { type: "list", allowBlank: !c.required, formulae: [rng], showErrorMessage: true, errorTitle: "Not in the list", error: "Choose one of the options." };
      allowed = (f.options ?? []).map((o) => `${o.value} = ${o.label.en}`).join("; ");
    } else if (f?.kind === "yesno") {
      validation = { type: "list", allowBlank: !c.required, formulae: ['"yes,no"'], showErrorMessage: true, errorTitle: "Yes or no", error: "Enter yes or no." };
      allowed = "yes / no";
    } else if (f?.kind === "number") {
      const min = f.min ?? 0;
      const max = f.max ?? 1_000_000;
      validation = {
        type: "whole",
        operator: "between",
        allowBlank: !c.required,
        formulae: [min, max],
        showErrorMessage: true,
        errorTitle: "Whole number",
        error: `Enter a whole number from ${min} to ${max}.`,
      };
      allowed = `whole number, ${min} to ${max}`;
    } else if (f?.kind === "date") {
      allowed = "dd/mm/yyyy";
      ws.getColumn(n).numFmt = "dd/mm/yyyy";
    } else if (f?.kind === "time") {
      allowed = "hh:mm";
    }
    if (validation) for (let r = 2; r <= VALIDATED_ROWS + 1; r++) ws.getCell(r, n).dataValidation = validation;

    help.addRow([c.header, f?.label.en ?? c.header, f?.label.hi ?? "", c.kind, c.required ? "yes" : "no", allowed]);
  });
  help.columns.forEach((col) => (col.width = 28));
  help.getColumn(6).width = 60;
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
