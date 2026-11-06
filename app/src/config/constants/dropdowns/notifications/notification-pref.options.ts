import type { NotificationPrefs } from "@/features/preferences/interfaces/preferences.interfaces";

export const NotificationPrefOptions: { id: keyof NotificationPrefs; label: string; description: string }[] = [
    { id: "study_reminders", label: "Study reminders", description: "A nudge in the afternoon if you haven't studied yet" },
    { id: "flashcards_due", label: "Flashcards due", description: "When cards are waiting for review" },
    { id: "streak_risk", label: "Streak at risk", description: "Evening reminder before your streak breaks" },
    { id: "exams", label: "Upcoming exams", description: "7, 3 and 1 day before an exam date" },
    { id: "goals", label: "Study goals", description: "When you complete your daily goal" },
    { id: "quiz_completion", label: "Quiz results", description: "Summary after each quiz or exam simulation" },
    { id: "achievements", label: "Achievements", description: "When you unlock an achievement" },
    { id: "invitations", label: "Invitations", description: "When someone invites you to a project" },
    { id: "collaboration", label: "Collaboration activity", description: "Shares, new members and project activity" },
];

export const EmailNotificationOption = { id: "email" as const, label: "Also send by email", description: "Email copies of enabled notifications (invitations are always emailed)" };
