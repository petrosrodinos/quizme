export interface NotificationPrefs {
    study_reminders?: boolean;
    flashcards_due?: boolean;
    invitations?: boolean;
    collaboration?: boolean;
    quiz_completion?: boolean;
    goals?: boolean;
    exams?: boolean;
    streak_risk?: boolean;
    achievements?: boolean;
    email?: boolean;
}

export interface UserPreferences {
    sound_enabled: boolean;
    volume: number;
    sound_feedback: boolean;
    sound_celebrations: boolean;
    sound_timers: boolean;
    animations_enabled: boolean;
    haptics_enabled: boolean;
    focus_mode: boolean;
    leaderboard_opt_in: boolean;
    achievement_popups: boolean;
    /** UI / email / notification language. */
    language: "en" | "el";
    notification_prefs: NotificationPrefs;
}

export type UpdatePreferencesDto = Partial<UserPreferences>;
