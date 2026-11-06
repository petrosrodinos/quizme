import type { ExportFormat, ExportType } from "@/features/exports/interfaces/exports.interfaces";

export const ExportTypeFormOptions: { id: ExportType; label: string; description: string }[] = [
    { id: "flashcards", label: "Flashcards", description: "Front, back, deck, topic and tags" },
    { id: "questions", label: "Question bank", description: "Questions with answers and explanations" },
    { id: "notes", label: "Notes", description: "Your notes, highlights and annotations" },
    { id: "study_guides", label: "Study guides", description: "Generated summaries and cheat sheets" },
    { id: "attempts", label: "Quiz results", description: "Your attempt history and scores" },
];

export const ExportFormatFormOptions: { id: ExportFormat; label: string }[] = [
    { id: "csv", label: "CSV (spreadsheet)" },
    { id: "json", label: "JSON" },
    { id: "md", label: "Markdown" },
    { id: "txt", label: "Plain text" },
    { id: "html", label: "Print / save as PDF" },
];
