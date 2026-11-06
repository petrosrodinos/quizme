import { CardStatuses, type CardStatus } from "@/features/flashcards/interfaces/flashcards.interfaces";
import { tOption } from "@/lib/i18n-options";

export const CardStatusFormOptions: { id: CardStatus; label: string }[] = [
    tOption(CardStatuses.NEW, "flashcards:status.NEW"),
    tOption(CardStatuses.LEARNING, "flashcards:status.LEARNING"),
    tOption(CardStatuses.NEEDS_REVIEW, "flashcards:status.NEEDS_REVIEW"),
    tOption(CardStatuses.KNOWN, "flashcards:status.KNOWN"),
];

export const CardStatusFilterOptions: { id: CardStatus | "all"; label: string }[] = [tOption("all", "flashcards:status.all"), ...CardStatusFormOptions];

export const getCardStatusLabel = (status: CardStatus | string): string => CardStatusFormOptions.find((o) => o.id === status)?.label ?? status;
