import { NotificationTypes, type NotificationType } from "@/features/notifications/interfaces/notifications.interfaces";

export const NotificationTypeOptions: { id: NotificationType; label: string }[] = [
    { id: NotificationTypes.STUDY_REMINDER, label: "Reminder" },
    { id: NotificationTypes.FLASHCARDS_DUE, label: "Flashcards" },
    { id: NotificationTypes.INVITATION, label: "Invitation" },
    { id: NotificationTypes.COLLABORATION, label: "Collaboration" },
    { id: NotificationTypes.QUIZ_COMPLETED, label: "Quiz" },
    { id: NotificationTypes.GOAL, label: "Goal" },
    { id: NotificationTypes.EXAM_UPCOMING, label: "Exam" },
    { id: NotificationTypes.STREAK_RISK, label: "Streak" },
    { id: NotificationTypes.ACHIEVEMENT, label: "Achievement" },
    { id: NotificationTypes.DOCUMENT, label: "Document" },
];

export const getNotificationTypeLabel = (type: string) => NotificationTypeOptions.find((o) => o.id === type)?.label ?? "Update";
