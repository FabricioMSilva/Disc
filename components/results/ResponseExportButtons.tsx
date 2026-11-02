"use client";

import { Download, FileSpreadsheet, Printer } from "lucide-react";
import type { ReportResponse } from "@/lib/assessment-report";

function protectSpreadsheetValue(value: string) {
  return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string) {
  const safeValue = protectSpreadsheetValue(value).replaceAll('"', '""');
  return `"${safeValue}"`;
}

function fileSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ResponseExportButtons({ participantName, responses }: { participantName: string; responses: ReportResponse[] }) {
  function downloadCsv() {
    const rows = [
      ["Número", "Seção", "Pergunta", "Resposta"],
      ...responses.map((item) => [String(item.number), item.section, item.question, item.response]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `respostas-${fileSlug(participantName) || "avaliacao"}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="report-export-actions no-print">
    <button type="button" className="button-secondary" onClick={() => window.print()} aria-label="Salvar respostas em PDF">
      <Printer size={15} /> Salvar PDF
    </button>
    <button type="button" className="button-secondary" onClick={downloadCsv} aria-label="Baixar respostas para abrir no Excel">
      <FileSpreadsheet size={15} /> Excel (.csv) <Download size={14} />
    </button>
  </div>;
}
