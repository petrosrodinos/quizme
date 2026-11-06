import { tr } from "@/lib/i18n-options";

/** Known server/socket error messages for multiplayer games → translation keys (fallback: raw message). */
const GAME_ERROR_KEYS: Record<string, string> = {
    "Time's up": "games:serverErrors.timesUp",
    "Already answered": "games:serverErrors.alreadyAnswered",
    "Only the host can start the game": "games:serverErrors.onlyHostStart",
    "Only the host can advance": "games:serverErrors.onlyHostAdvance",
    "Game already started": "games:serverErrors.alreadyStarted",
    "No active question": "games:serverErrors.noActiveQuestion",
    "This question is no longer active": "games:serverErrors.questionInactive",
    "Join the game first": "games:serverErrors.joinFirst",
    "Game not found": "games:serverErrors.notFound",
    "Quiz not found": "games:serverErrors.quizNotFound",
    "Quiz is not ready yet": "games:serverErrors.quizNotReady",
    "Room not found": "games:serverErrors.roomNotFound",
    "Realtime connection is not available": "games:serverErrors.offline",
    "Realtime request timed out": "games:serverErrors.timeout",
};

export const translateGameError = (message?: string | null): string => {
    if (!message) return tr("common:errors.generic");
    const key = GAME_ERROR_KEYS[message.trim()];
    return key ? tr(key) : message;
};
