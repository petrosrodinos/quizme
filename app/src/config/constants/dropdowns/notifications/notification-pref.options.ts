import { tOption } from "@/lib/i18n-options";
import type { NotificationPrefs } from "@/features/preferences/interfaces/preferences.interfaces";

const pref = (id: keyof NotificationPrefs) => tOption(id, `settings:notificationPrefs.${id}.label`, `settings:notificationPrefs.${id}.description`) as { id: keyof NotificationPrefs; label: string; description: string };

export const NotificationPrefOptions: { id: keyof NotificationPrefs; label: string; description: string }[] = [
    pref("study_reminders"),
    pref("flashcards_due"),
    pref("streak_risk"),
    pref("exams"),
    pref("goals"),
    pref("quiz_completion"),
    pref("achievements"),
    pref("invitations"),
    pref("collaboration"),
];

export const EmailNotificationOption = tOption("email" as const, "settings:notificationPrefs.email.label", "settings:notificationPrefs.email.description") as {
    id: "email";
    label: string;
    description: string;
};
