import { QuestionTypes, type QuestionType } from "@/features/questions/interfaces/questions.interfaces";

export const QuestionTypeFormOptions: { id: QuestionType; label: string }[] = [
    { id: QuestionTypes.MCQ, label: "Multiple choice" },
    { id: QuestionTypes.MULTI_SELECT, label: "Multiple select" },
    { id: QuestionTypes.TRUE_FALSE, label: "True / False" },
    { id: QuestionTypes.FILL_BLANK, label: "Fill in the blank" },
    { id: QuestionTypes.FREE_TEXT, label: "Free text" },
    { id: QuestionTypes.MATCHING, label: "Matching" },
    { id: QuestionTypes.ORDERING, label: "Ordering" },
];

export const QuestionTypeDescriptionOptions: Record<QuestionType, string> = {
    MCQ: "Pick the single correct answer.",
    MULTI_SELECT: "Select every correct answer.",
    TRUE_FALSE: "Decide whether the statement is true.",
    FILL_BLANK: "Type the missing term.",
    FREE_TEXT: "Answer in your own words — graded by AI against your sources.",
    MATCHING: "Match each item on the left with its partner.",
    ORDERING: "Put the items in the correct order.",
};

export const getQuestionTypeLabel = (type: QuestionType | string): string => QuestionTypeFormOptions.find((o) => o.id === type)?.label ?? type;

export const getQuestionTypeDescription = (type: QuestionType | string): string => QuestionTypeDescriptionOptions[type as QuestionType] ?? "";
