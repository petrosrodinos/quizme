/** Server → client Socket.IO events (mirrors api/src/core/realtime/realtime.service.ts). */
export const RealtimeEvents = {
    JOB_UPDATED: "job:updated",
    DOCUMENT_STATUS: "document:status",
    GENERATION_STATUS: "generation:status",
    XP_GAINED: "gamification:xp",
    LEVEL_UP: "gamification:level_up",
    ACHIEVEMENT_UNLOCKED: "gamification:achievement",
    STREAK_UPDATED: "gamification:streak",
    DAILY_GOAL_MET: "gamification:daily_goal",
    NOTIFICATION: "notification:new",
    ROOM_STATE: "room:state",
    ROOM_MESSAGE: "room:message",
    ROOM_PRESENCE: "room:presence",
    GAME_STATE: "game:state",
} as const;

export type RealtimeEvent = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
