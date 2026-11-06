export const NotificationTypes = {
    STUDY_REMINDER: "study_reminder",
    FLASHCARDS_DUE: "flashcards_due",
    INVITATION: "invitation",
    COLLABORATION: "collaboration",
    QUIZ_COMPLETED: "quiz_completed",
    GOAL: "goal",
    EXAM_UPCOMING: "exam_upcoming",
    STREAK_RISK: "streak_risk",
    ACHIEVEMENT: "achievement",
    DOCUMENT: "document",
} as const;
export type NotificationType = (typeof NotificationTypes)[keyof typeof NotificationTypes];

export interface AppNotification {
    id: string;
    user_id: string;
    type: NotificationType | string;
    title: string;
    body: string | null;
    link: string | null;
    data: Record<string, unknown> | null;
    read_at: string | null;
    created_at: string;
}

export interface NotificationsPage {
    data: AppNotification[];
    pagination: { total: number; page: number; limit: number; total_pages: number; has_next: boolean; has_prev: boolean };
}

export interface NotificationQuery {
    page?: number;
    limit?: number;
    unread?: boolean;
}
