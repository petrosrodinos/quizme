import { GenerationStatuses, type GenerationStatus } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { tOption } from "@/lib/i18n-options";

export const GenerationStatusOptions = [
    tOption(GenerationStatuses.PENDING, "quiz:generationStatus.PENDING"),
    tOption(GenerationStatuses.GENERATING, "quiz:generationStatus.GENERATING"),
    tOption(GenerationStatuses.READY, "quiz:generationStatus.READY"),
    tOption(GenerationStatuses.FAILED, "quiz:generationStatus.FAILED"),
];

export const getGenerationStatusLabel = (s: GenerationStatus | string): string => GenerationStatusOptions.find((o) => o.id === s)?.label ?? s;
