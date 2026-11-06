import { QuizModes, type QuizMode } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { tOption, tr } from "@/lib/i18n-options";

const MODES: QuizMode[] = [QuizModes.PRACTICE, QuizModes.ADAPTIVE, QuizModes.REVIEW, QuizModes.EXAM, QuizModes.SELECTION, QuizModes.SHARED];

export const QuizModeFormOptions: { id: QuizMode; label: string; description: string }[] = MODES.map(
    (mode) => tOption(mode, `quiz:modes.${mode}`, `quiz:modeDescriptions.${mode}`) as { id: QuizMode; label: string; description: string },
);

export const getQuizModeLabel = (mode: QuizMode | string): string => QuizModeFormOptions.find((o) => o.id === mode)?.label ?? mode;

export const getQuizModeDescription = (mode: QuizMode | string): string => (MODES.includes(mode as QuizMode) ? tr(`quiz:modeDescriptions.${mode}`) : "");
