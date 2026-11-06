import type { ExportFormat, ExportType } from "@/features/exports/interfaces/exports.interfaces";
import { tOption } from "@/lib/i18n-options";

export const ExportTypeFormOptions: { id: ExportType; label: string; description: string }[] = (
    ["flashcards", "questions", "notes", "study_guides", "attempts"] as ExportType[]
).map((id) => tOption(id, `projectSettings:export.types.${id}.label`, `projectSettings:export.types.${id}.description`) as { id: ExportType; label: string; description: string });

export const ExportFormatFormOptions: { id: ExportFormat; label: string }[] = (["csv", "json", "md", "txt", "html"] as ExportFormat[]).map((id) =>
    tOption(id, `projectSettings:export.formats.${id}`),
);
