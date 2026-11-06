import { QuizDifficulties, type QuizDifficulty } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { tOption } from "@/lib/i18n-options";

export const QuizDifficultyFormOptions: { id: QuizDifficulty; label: string }[] = [
    tOption(QuizDifficulties.MIXED, "quiz:quizDifficulty.mixed"),
    tOption(QuizDifficulties.EASY, "quiz:quizDifficulty.easy"),
    tOption(QuizDifficulties.MEDIUM, "quiz:quizDifficulty.medium"),
    tOption(QuizDifficulties.HARD, "quiz:quizDifficulty.hard"),
    tOption(QuizDifficulties.ADAPTIVE, "quiz:quizDifficulty.adaptive"),
];

export const getQuizDifficultyLabel = (d: QuizDifficulty | string): string => QuizDifficultyFormOptions.find((o) => o.id === d)?.label ?? d;
