import { ContentOrigins, type ContentOrigin } from "@/features/questions/interfaces/questions.interfaces";
import { tOption } from "@/lib/i18n-options";

export const QuestionOriginFormOptions: { id: ContentOrigin; label: string }[] = [
    tOption(ContentOrigins.AI, "quiz:origin.AI"),
    tOption(ContentOrigins.MANUAL, "quiz:origin.MANUAL"),
    tOption(ContentOrigins.IMPORTED, "quiz:origin.IMPORTED"),
];

export const QuestionOriginFilterOptions: { id: ContentOrigin | "all"; label: string }[] = [tOption("all", "quiz:filters.anySource"), ...QuestionOriginFormOptions];

export const getQuestionOriginLabel = (origin: string): string => QuestionOriginFormOptions.find((o) => o.id === origin)?.label ?? origin;
