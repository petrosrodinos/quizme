import { QuestionTypes, type QuestionType } from "@/features/questions/interfaces/questions.interfaces";
import { tOption, tr } from "@/lib/i18n-options";

const TYPES: QuestionType[] = [
    QuestionTypes.MCQ,
    QuestionTypes.MULTI_SELECT,
    QuestionTypes.TRUE_FALSE,
    QuestionTypes.FILL_BLANK,
    QuestionTypes.FREE_TEXT,
    QuestionTypes.MATCHING,
    QuestionTypes.ORDERING,
];

export const QuestionTypeFormOptions: { id: QuestionType; label: string; description: string }[] = TYPES.map((type) =>
    tOption(type, `quiz:types.${type}`, `quiz:typeDescriptions.${type}`) as { id: QuestionType; label: string; description: string },
);

export const getQuestionTypeLabel = (type: QuestionType | string): string => QuestionTypeFormOptions.find((o) => o.id === type)?.label ?? type;

export const getQuestionTypeDescription = (type: QuestionType | string): string =>
    TYPES.includes(type as QuestionType) ? tr(`quiz:typeDescriptions.${type}`) : "";
