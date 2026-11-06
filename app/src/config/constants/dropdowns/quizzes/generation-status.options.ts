import { GenerationStatuses, type GenerationStatus } from "@/features/quizzes/interfaces/quizzes.interfaces";

export const GenerationStatusOptions: { id: GenerationStatus; label: string }[] = [
    { id: GenerationStatuses.PENDING, label: "Queued" },
    { id: GenerationStatuses.GENERATING, label: "Generating questions…" },
    { id: GenerationStatuses.READY, label: "Ready" },
    { id: GenerationStatuses.FAILED, label: "Failed" },
];

export const getGenerationStatusLabel = (s: GenerationStatus | string): string => GenerationStatusOptions.find((o) => o.id === s)?.label ?? s;
