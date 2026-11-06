import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export const RealtimeEvents = {
    JOB_UPDATED: 'job:updated',
    DOCUMENT_STATUS: 'document:status',
    GENERATION_STATUS: 'generation:status',
    XP_GAINED: 'gamification:xp',
    LEVEL_UP: 'gamification:level_up',
    ACHIEVEMENT_UNLOCKED: 'gamification:achievement',
    STREAK_UPDATED: 'gamification:streak',
    DAILY_GOAL_MET: 'gamification:daily_goal',
    NOTIFICATION: 'notification:new',
    ROOM_STATE: 'room:state',
    ROOM_MESSAGE: 'room:message',
    ROOM_PRESENCE: 'room:presence',
    GAME_STATE: 'game:state',
} as const;

/** Thin facade so domain services can push events without depending on the gateway. */
@Injectable()
export class RealtimeService {
    private server: Server | null = null;

    bind(server: Server) {
        this.server = server;
    }

    get io(): Server | null {
        return this.server;
    }

    toUser(userId: string, event: string, payload: unknown) {
        this.server?.to(`user:${userId}`).emit(event, payload);
    }

    toRoom(room: string, event: string, payload: unknown) {
        this.server?.to(room).emit(event, payload);
    }

    async roomSize(room: string): Promise<number> {
        if (!this.server) return 0;
        const sockets = await this.server.in(room).fetchSockets();
        return sockets.length;
    }
}
