import { ContentOrigins, type ContentOrigin } from "@/features/questions/interfaces/questions.interfaces";

export const QuestionOriginFormOptions: { id: ContentOrigin; label: string }[] = [
    { id: ContentOrigins.AI, label: "AI-generated" },
    { id: ContentOrigins.MANUAL, label: "Manual" },
    { id: ContentOrigins.IMPORTED, label: "Imported" },
];

export const QuestionOriginFilterOptions: { id: ContentOrigin | "all"; label: string }[] = [{ id: "all", label: "Any source" }, ...QuestionOriginFormOptions];

export const getQuestionOriginLabel = (origin: string): string => QuestionOriginFormOptions.find((o) => o.id === origin)?.label ?? origin;
