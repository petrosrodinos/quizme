import { ChatModes, type ChatMode } from "@/features/tutor/interfaces/tutor.interfaces";

export const ChatModeFormOptions: { id: ChatMode; label: string; description: string }[] = [
    { id: ChatModes.TUTOR, label: "Tutor", description: "Clear explanations grounded in your sources" },
    { id: ChatModes.SOCRATIC, label: "Socratic", description: "Guiding questions that lead you to the answer" },
];

export const getChatModeLabel = (mode: ChatMode | string): string => ChatModeFormOptions.find((o) => o.id === mode)?.label ?? mode;

export const TutorSuggestedPromptOptions: { id: string; label: string }[] = [
    { id: "chapter", label: "Explain this chapter to me" },
    { id: "concept", label: "I don't understand this concept: " },
    { id: "example", label: "Give me an example" },
    { id: "quiz_me", label: "Ask me questions about this topic" },
    { id: "beginner", label: "Teach me this as if I'm a beginner" },
    { id: "why_wrong", label: "Why is this answer wrong? " },
];
