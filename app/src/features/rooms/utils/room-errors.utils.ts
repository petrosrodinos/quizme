import { tr } from "@/lib/i18n-options";

/** Known server/socket error messages for study rooms → translation keys (fallback: raw message). */
const ROOM_ERROR_KEYS: Record<string, string> = {
    "Room not found": "rooms:serverErrors.notFound",
    "Empty message": "rooms:serverErrors.emptyMessage",
    "Only the creator can close this room": "rooms:serverErrors.onlyCreatorClose",
    "Realtime connection is not available": "rooms:serverErrors.offline",
    "Realtime request timed out": "rooms:serverErrors.timeout",
    unauthorized: "rooms:serverErrors.unauthorized",
};

export const translateRoomError = (message?: string | null): string => {
    if (!message) return tr("common:errors.generic");
    const key = ROOM_ERROR_KEYS[message.trim()];
    return key ? tr(key) : message;
};
