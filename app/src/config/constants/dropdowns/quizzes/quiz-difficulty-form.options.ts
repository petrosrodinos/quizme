import { QuizDifficulties, type QuizDifficulty } from "@/features/quizzes/interfaces/quizzes.interfaces";

export const QuizDifficultyFormOptions: { id: QuizDifficulty; label: string }[] = [
    { id: QuizDifficulties.MIXED, label: "Mixed" },
    { id: QuizDifficulties.EASY, label: "Easy" },
    { id: QuizDifficulties.MEDIUM, label: "Medium" },
    { id: QuizDifficulties.HARD, label: "Hard" },
    { id: QuizDifficulties.ADAPTIVE, label: "Adaptive" },
];

export const getQuizDifficultyLabel = (d: QuizDifficulty | string): string => QuizDifficultyFormOptions.find((o) => o.id === d)?.label ?? d;
