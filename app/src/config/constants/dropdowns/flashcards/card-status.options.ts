import { CardStatuses, type CardStatus } from "@/features/flashcards/interfaces/flashcards.interfaces";

export const CardStatusFormOptions: { id: CardStatus; label: string }[] = [
    { id: CardStatuses.NEW, label: "New" },
    { id: CardStatuses.LEARNING, label: "Learning" },
    { id: CardStatuses.NEEDS_REVIEW, label: "Needs review" },
    { id: CardStatuses.KNOWN, label: "Known" },
];

export const CardStatusFilterOptions: { id: CardStatus | "all"; label: string }[] = [{ id: "all", label: "All statuses" }, ...CardStatusFormOptions];

export const getCardStatusLabel = (status: CardStatus | string): string => CardStatusFormOptions.find((o) => o.id === status)?.label ?? status;
