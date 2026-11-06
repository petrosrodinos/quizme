import { ChatModes, type ChatMode } from "@/features/tutor/interfaces/tutor.interfaces";
import { tOption, tr } from "@/lib/i18n-options";

const mode = (id: ChatMode) => ({
    id,
    get label(): string {
        return tr(`tutor:modes.${id}.label`);
    },
    get description(): string {
        return tr(`tutor:modes.${id}.description`);
    },
});

export const ChatModeFormOptions: { id: ChatMode; label: string; description: string }[] = [mode(ChatModes.TUTOR), mode(ChatModes.SOCRATIC)];

export const getChatModeLabel = (m: ChatMode | string): string => ChatModeFormOptions.find((o) => o.id === m)?.label ?? m;

/** Suggested prompts are sent as the user's message, so they follow the UI language. */
export const TutorSuggestedPromptOptions: { id: string; label: string }[] = [
    tOption("chapter", "tutor:suggestions.chapter"),
    tOption("concept", "tutor:suggestions.concept"),
    tOption("example", "tutor:suggestions.example"),
    tOption("quiz_me", "tutor:suggestions.quiz_me"),
    tOption("beginner", "tutor:suggestions.beginner"),
    tOption("why_wrong", "tutor:suggestions.why_wrong"),
];
