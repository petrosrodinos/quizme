export const SessionBlockTypes = {
    FLASHCARDS: "flashcards",
    WEAK_TOPICS: "weak_topics",
    ADAPTIVE_QUIZ: "adaptive_quiz",
    RECALL: "recall",
    EXAM: "exam",
    UPLOAD: "upload",
} as const;
export type SessionBlockType = (typeof SessionBlockTypes)[keyof typeof SessionBlockTypes];

export const StudyActivityTypes = {
    FLASHCARDS: "FLASHCARDS",
    QUIZ: "QUIZ",
    EXAM: "EXAM",
    RECALL: "RECALL",
    TEACH_BACK: "TEACH_BACK",
    TUTOR: "TUTOR",
    READING: "READING",
    DAILY_SESSION: "DAILY_SESSION",
    ROOM: "ROOM",
} as const;
export type StudyActivityType = (typeof StudyActivityTypes)[keyof typeof StudyActivityTypes];

export interface SessionBlock {
    type: SessionBlockType;
    title: string;
    minutes: number;
    project_id: string | null;
    project_title: string | null;
    count?: number;
    reason: string;
    link: string;
    topic_ids?: string[];
}

export interface DailySession {
    date: string;
    total_minutes: number;
    goal_minutes: number;
    blocks: SessionBlock[];
    focus_project: { id: string; title: string } | null;
    completed: boolean;
    progress: { minutes: number; questions?: number; cards?: number; goal_met?: boolean };
}

export interface LogActivityDto {
    project_id?: string;
    type: StudyActivityType;
    seconds: number;
}
