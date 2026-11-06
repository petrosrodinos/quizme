import type { ExportFormat } from "@/features/exports/interfaces/exports.interfaces";

export const ExportFormatOptions: { id: ExportFormat; label: string }[] = [
    { id: "csv", label: "CSV (spreadsheet)" },
    { id: "json", label: "JSON" },
    { id: "md", label: "Markdown" },
    { id: "txt", label: "Plain text" },
    { id: "html", label: "PDF (print)" },
];
