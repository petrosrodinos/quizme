export type ExportType = "flashcards" | "questions" | "notes" | "study_guides" | "attempts";
export type ExportFormat = "csv" | "json" | "md" | "txt" | "html";

export interface ExportRequest {
    projectId: string;
    type: ExportType;
    format: ExportFormat;
    deck_id?: string;
}
