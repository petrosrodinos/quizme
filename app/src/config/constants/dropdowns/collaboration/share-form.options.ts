import type { SharePermission, ShareResourceType, ShareTargetType } from "@/features/shares/interfaces/shares.interfaces";

export const ShareResourceTypeFormOptions: { id: ShareResourceType; label: string; description: string }[] = [
    { id: "PROJECT", label: "Whole project", description: "Overview, topics and all study material" },
    { id: "DOCUMENT", label: "Document", description: "An uploaded source with its summary" },
    { id: "DECK", label: "Flashcard deck", description: "All cards in a deck" },
    { id: "QUIZ", label: "Quiz", description: "Questions (answers stay hidden)" },
    { id: "NOTE", label: "Note", description: "One of your notes" },
    { id: "STUDY_PLAN", label: "Study plan", description: "Your recommended plan" },
];

export const getShareResourceTypeLabel = (id: string): string => ShareResourceTypeFormOptions.find((o) => o.id === id)?.label ?? id;

export const ShareTargetTypeFormOptions: { id: ShareTargetType; label: string; description: string }[] = [
    { id: "USER", label: "Specific person", description: "Share with a QuizMe user by email" },
    { id: "LINK", label: "Link", description: "Anyone signed in with the link can open it" },
    { id: "ORGANIZATION", label: "Organization", description: "Everyone in one of your groups" },
];

export const getShareTargetTypeLabel = (id: string): string => ShareTargetTypeFormOptions.find((o) => o.id === id)?.label ?? id;

export const SharePermissionFormOptions: { id: SharePermission; label: string }[] = [
    { id: "VIEW", label: "Can view" },
    { id: "EDIT", label: "Can edit" },
];

export const getSharePermissionLabel = (id: string): string => SharePermissionFormOptions.find((o) => o.id === id)?.label ?? id;
