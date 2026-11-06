import { tOption, tr } from "@/lib/i18n-options";
import { NotificationTypes, type NotificationType } from "@/features/notifications/interfaces/notifications.interfaces";

export const NotificationTypeOptions: { id: NotificationType; label: string }[] = [
    tOption(NotificationTypes.STUDY_REMINDER, "notifications:types.study_reminder"),
    tOption(NotificationTypes.FLASHCARDS_DUE, "notifications:types.flashcards_due"),
    tOption(NotificationTypes.INVITATION, "notifications:types.invitation"),
    tOption(NotificationTypes.COLLABORATION, "notifications:types.collaboration"),
    tOption(NotificationTypes.QUIZ_COMPLETED, "notifications:types.quiz_completed"),
    tOption(NotificationTypes.GOAL, "notifications:types.goal"),
    tOption(NotificationTypes.EXAM_UPCOMING, "notifications:types.exam_upcoming"),
    tOption(NotificationTypes.STREAK_RISK, "notifications:types.streak_risk"),
    tOption(NotificationTypes.ACHIEVEMENT, "notifications:types.achievement"),
    tOption(NotificationTypes.DOCUMENT, "notifications:types.document"),
];

export const getNotificationTypeLabel = (type: string) => NotificationTypeOptions.find((o) => o.id === type)?.label ?? tr("notifications:types.update");
