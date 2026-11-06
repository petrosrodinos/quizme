import type { ExportFormat } from "@/features/exports/interfaces/exports.interfaces";
import { tOption } from "@/lib/i18n-options";

export const ExportFormatOptions: { id: ExportFormat; label: string }[] = [
    tOption("csv", "exports:formats.csv"),
    tOption("json", "exports:formats.json"),
    tOption("md", "exports:formats.md"),
    tOption("txt", "exports:formats.txt"),
    tOption("html", "exports:formats.html"),
];
