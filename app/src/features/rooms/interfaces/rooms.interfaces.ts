import type { UserSummary } from "@/features/collaboration/interfaces/collaboration.interfaces";

export type TimerMode = "focus" | "break";
export type TimerStatus = "idle" | "running" | "paused";
export type TimerAction = "start" | "pause" | "reset";

export interface TimerState {
    status: TimerStatus;
    mode: TimerMode;
    duration_sec: number;
    remaining_sec: number;
    ends_at: string | null;
    updated_by: string | null;
}

export interface StudyRoom {
    id: string;
    project_id: string;
    name: string;
    created_by: string;
    timer_state: TimerState | null;
    shared_notes: string;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
    project?: { id: string; title: string };
    online?: number;
}

export interface RoomMessage {
    id: string;
    room_id: string;
    user_id: string;
    content: string;
    is_ai: boolean;
    created_at: string;
    user: UserSummary;
}

export interface PresenceUser {
    id: string;
    name: string;
    avatar_url: string | null;
}

export interface RoomDetail extends Omit<StudyRoom, "online"> {
    timer_state: TimerState;
    messages: RoomMessage[];
    active_game: { id: string; status: string } | null;
    online: PresenceUser[];
}

/** Partial updates pushed on 'room:state'. */
export interface RoomStatePatch {
    id: string;
    closed?: boolean;
    timer_state?: TimerState;
    shared_notes?: string;
    notes_updated_by?: string;
    active_game?: { id: string; status: string };
}

export interface RoomPresencePayload {
    room_id: string;
    users: PresenceUser[];
}

/** Client → server socket events for study rooms. */
export const RoomSocketEvents = {
    JOIN: "room:join",
    LEAVE: "room:leave",
    MESSAGE: "room:message",
    TIMER: "room:timer",
    NOTES: "room:notes",
} as const;
