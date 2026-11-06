import { tOption } from "@/lib/i18n-options";

/** Question difficulty scale 1-5. */
export const QuestionDifficultyFormOptions = [
    tOption("1", "quiz:questionDifficulty.1"),
    tOption("2", "quiz:questionDifficulty.2"),
    tOption("3", "quiz:questionDifficulty.3"),
    tOption("4", "quiz:questionDifficulty.4"),
    tOption("5", "quiz:questionDifficulty.5"),
];

export const QuestionDifficultyFilterOptions: { id: string; label: string }[] = [tOption("all", "quiz:filters.anyDifficulty"), ...QuestionDifficultyFormOptions];

export const getQuestionDifficultyLabel = (difficulty: number | string): string =>
    QuestionDifficultyFormOptions.find((o) => o.id === String(Math.round(Number(difficulty))))?.label ?? String(difficulty);
