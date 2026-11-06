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

export const UiModes = {
    CLASSIC: "classic",
    PLAYFUL: "playful",
} as const;
export type UiMode = (typeof UiModes)[keyof typeof UiModes];

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
    /** "playful" = mobile-first, Duolingo-style UI; "classic" = original desktop sidebar UI. */
    ui_mode: UiMode;
    notification_prefs: NotificationPrefs;
}

export type UpdatePreferencesDto = Partial<UserPreferences>;
