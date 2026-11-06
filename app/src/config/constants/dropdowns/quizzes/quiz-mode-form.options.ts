import { QuizModes, type QuizMode } from "@/features/quizzes/interfaces/quizzes.interfaces";

export const QuizModeFormOptions: { id: QuizMode; label: string }[] = [
    { id: QuizModes.PRACTICE, label: "Practice" },
    { id: QuizModes.ADAPTIVE, label: "Adaptive" },
    { id: QuizModes.REVIEW, label: "Mistake review" },
    { id: QuizModes.EXAM, label: "Exam simulation" },
    { id: QuizModes.SELECTION, label: "From selection" },
    { id: QuizModes.SHARED, label: "Shared" },
];

export const QuizModeDescriptionOptions: Record<QuizMode, string> = {
    PRACTICE: "Fresh questions from your material with instant feedback.",
    ADAPTIVE: "Adjusts difficulty to your level and targets concepts you keep missing.",
    REVIEW: "Practise what you previously got wrong — retry or test the same concepts in new ways.",
    EXAM: "Timed, distraction-free conditions. Results only at the end.",
    SELECTION: "Questions generated from a highlighted passage.",
    SHARED: "A quiz shared with project members.",
};

export const getQuizModeLabel = (mode: QuizMode | string): string => QuizModeFormOptions.find((o) => o.id === mode)?.label ?? mode;

export const getQuizModeDescription = (mode: QuizMode | string): string => QuizModeDescriptionOptions[mode as QuizMode] ?? "";
