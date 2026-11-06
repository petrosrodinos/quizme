export interface DailyGoalProgress {
    type: string;
    minutes: number;
    xp: number;
    progress_minutes: number;
    progress_xp: number;
    met: boolean;
}

export interface GamificationProfile {
    total_xp: number;
    level: number;
    level_title: string;
    xp_into_level: number;
    xp_for_next_level: number;
    current_streak: number;
    longest_streak: number;
    streak_freezes: number;
    daily_goal: DailyGoalProgress;
}

export interface XpGainedEvent {
    amount: number;
    total_xp: number;
    source_type: string;
    project_id?: string | null;
}

export interface LevelUpEvent {
    level: number;
    level_title: string;
}

export interface AchievementUnlockedEvent {
    key: string;
    title: string;
    description: string;
    icon: string;
    rarity: string;
}

export interface StreakUpdatedEvent {
    current_streak: number;
}

export const DailyGoalTypes = {
    CASUAL: "CASUAL",
    REGULAR: "REGULAR",
    SERIOUS: "SERIOUS",
    INTENSE: "INTENSE",
    CUSTOM: "CUSTOM",
} as const;
export type DailyGoalType = (typeof DailyGoalTypes)[keyof typeof DailyGoalTypes];

export const AchievementRarities = {
    COMMON: "COMMON",
    UNCOMMON: "UNCOMMON",
    RARE: "RARE",
    EPIC: "EPIC",
    LEGENDARY: "LEGENDARY",
} as const;
export type AchievementRarity = (typeof AchievementRarities)[keyof typeof AchievementRarities];

export interface Achievement {
    key: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    rarity: AchievementRarity;
    hidden: boolean;
    target: number;
    progress: number;
    unlocked: boolean;
    unlocked_at: string | null;
}

export interface ActivityDay {
    date: string;
    xp_earned: number;
    minutes_studied: number;
    questions_answered: number;
    questions_correct: number;
    cards_reviewed: number;
    goal_met: boolean;
    freeze_used: boolean;
}

export interface UpdateDailyGoalDto {
    type: DailyGoalType;
    minutes?: number;
    xp?: number;
}

export interface LeaderboardEntry {
    user_id: string;
    name: string;
    avatar_url: string | null;
    xp: number;
    is_me: boolean;
    rank: number;
}

export interface Leaderboard {
    week_start: string;
    opted_in: boolean;
    entries: LeaderboardEntry[];
}
