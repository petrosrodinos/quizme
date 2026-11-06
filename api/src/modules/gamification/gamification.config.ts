import { AchievementRarity } from 'generated/prisma';

/** Server-side XP table (the client never submits XP values). */
export const XpRules = {
    CORRECT_ANSWER_BASE: 10,
    COMEBACK_BONUS: 5,
    CARD_GOOD_EASY: 5,
    CARD_AGAIN_HARD: 2,
    QUIZ_COMPLETED: 25,
    PERFECT_QUIZ_BONUS: 50,
    DAILY_SESSION: 50,
    EXAM_COMPLETED: 100,
    RECALL_HIGH_SCORE: 30,
    RECALL_THRESHOLD: 80,
    TOPIC_MASTERED: 150,
    /** Anti-farming windows. */
    SAME_QUESTION_WINDOW_MIN: 30,
    SAME_CARD_WINDOW_MIN: 10,
    SAME_QUIZ_COMPLETION_WINDOW_MIN: 10,
    MAX_COMBO_MULTIPLIER: 1.5,
} as const;

export const difficultyScale = (difficulty: number) => 0.6 + 0.2 * Math.min(5, Math.max(1, difficulty));

export const comboMultiplier = (combo: number) => (combo >= 10 ? XpRules.MAX_COMBO_MULTIPLIER : combo >= 5 ? 1.25 : combo >= 3 ? 1.1 : 1);

/** XP needed to advance from level n to n+1: 100 * n^1.5. */
export const xpForLevel = (n: number) => Math.round(100 * Math.pow(n, 1.5));

export const levelFromXp = (totalXp: number) => {
    let level = 1;
    let floor = 0;
    while (totalXp >= floor + xpForLevel(level)) {
        floor += xpForLevel(level);
        level++;
    }
    return { level, xpIntoLevel: totalXp - floor, xpForNext: xpForLevel(level) };
};

export const levelTitle = (level: number) =>
    level >= 50 ? 'Sage' : level >= 35 ? 'Master' : level >= 20 ? 'Expert' : level >= 10 ? 'Scholar' : level >= 5 ? 'Apprentice' : 'Novice';

export const DailyGoals = {
    CASUAL: 10,
    REGULAR: 20,
    SERIOUS: 40,
    INTENSE: 60,
} as const;
export type DailyGoalType = keyof typeof DailyGoals | 'CUSTOM';

export const MAX_STREAK_FREEZES = 2;
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export type AchievementMetric =
    | 'streak'
    | 'questions_answered'
    | 'cards_reviewed'
    | 'perfect_quizzes'
    | 'best_combo'
    | 'fixed_wrong'
    | 'topics_mastered'
    | 'project_mastered'
    | 'exams_completed'
    | 'exam_beat_previous'
    | 'exam_ready'
    | 'teach_backs'
    | 'socratic_sessions'
    | 'recalls'
    | 'rooms_joined'
    | 'games_won'
    | 'shares'
    | 'early_bird'
    | 'weekend_warrior';

export interface AchievementDef {
    key: string;
    title: string;
    description: string;
    icon: string;
    category: 'Consistency' | 'Volume' | 'Accuracy' | 'Mastery' | 'Exam' | 'Learning modes' | 'Social';
    rarity: AchievementRarity;
    criteria: { metric: AchievementMetric; target: number };
    hidden?: boolean;
}

/** Data-driven achievement catalogue, seeded into the DB on boot (edit here or in the DB). */
export const ACHIEVEMENTS: AchievementDef[] = [
    { key: 'streak_3', title: 'Warming up', description: 'Reach a 3-day study streak', icon: 'flame', category: 'Consistency', rarity: 'COMMON', criteria: { metric: 'streak', target: 3 } },
    { key: 'streak_7', title: '7-day streak', description: 'Study every day for a week', icon: 'flame', category: 'Consistency', rarity: 'UNCOMMON', criteria: { metric: 'streak', target: 7 } },
    { key: 'streak_14', title: 'Two strong weeks', description: 'Reach a 14-day streak', icon: 'flame', category: 'Consistency', rarity: 'RARE', criteria: { metric: 'streak', target: 14 } },
    { key: 'streak_30', title: '30-day streak', description: 'A full month of consistent study', icon: 'flame', category: 'Consistency', rarity: 'EPIC', criteria: { metric: 'streak', target: 30 } },
    { key: 'streak_60', title: 'Unstoppable', description: 'Reach a 60-day streak', icon: 'flame', category: 'Consistency', rarity: 'EPIC', criteria: { metric: 'streak', target: 60 } },
    { key: 'streak_100', title: 'Century', description: 'Reach a 100-day streak', icon: 'crown', category: 'Consistency', rarity: 'LEGENDARY', criteria: { metric: 'streak', target: 100 } },
    { key: 'streak_365', title: 'A year of learning', description: 'Reach a 365-day streak', icon: 'crown', category: 'Consistency', rarity: 'LEGENDARY', criteria: { metric: 'streak', target: 365 } },
    { key: 'early_bird', title: 'Early bird', description: 'Study before 8am', icon: 'sunrise', category: 'Consistency', rarity: 'UNCOMMON', criteria: { metric: 'early_bird', target: 1 }, hidden: true },
    { key: 'weekend_warrior', title: 'Weekend warrior', description: 'Study on both Saturday and Sunday', icon: 'calendar', category: 'Consistency', rarity: 'UNCOMMON', criteria: { metric: 'weekend_warrior', target: 1 } },
    { key: 'questions_100', title: 'Century of questions', description: 'Answer 100 questions', icon: 'list-checks', category: 'Volume', rarity: 'COMMON', criteria: { metric: 'questions_answered', target: 100 } },
    { key: 'questions_1000', title: 'Question machine', description: 'Answer 1,000 questions', icon: 'list-checks', category: 'Volume', rarity: 'RARE', criteria: { metric: 'questions_answered', target: 1000 } },
    { key: 'cards_100', title: 'Card shark', description: 'Review 100 flashcards', icon: 'layers', category: 'Volume', rarity: 'COMMON', criteria: { metric: 'cards_reviewed', target: 100 } },
    { key: 'cards_1000', title: '1,000 flashcards reviewed', description: 'Review 1,000 flashcards', icon: 'layers', category: 'Volume', rarity: 'RARE', criteria: { metric: 'cards_reviewed', target: 1000 } },
    { key: 'perfect_quiz', title: 'Perfect quiz', description: 'Score 100% on a quiz', icon: 'trophy', category: 'Accuracy', rarity: 'UNCOMMON', criteria: { metric: 'perfect_quizzes', target: 1 } },
    { key: 'combo_10', title: '10 in a row', description: 'Get 10 correct answers in a row', icon: 'zap', category: 'Accuracy', rarity: 'RARE', criteria: { metric: 'best_combo', target: 10 } },
    { key: 'comeback_20', title: 'Comeback', description: 'Fix 20 previously-wrong answers', icon: 'rotate-ccw', category: 'Accuracy', rarity: 'RARE', criteria: { metric: 'fixed_wrong', target: 20 } },
    { key: 'mastery_1', title: 'First mastery', description: 'Master your first topic', icon: 'star', category: 'Mastery', rarity: 'UNCOMMON', criteria: { metric: 'topics_mastered', target: 1 } },
    { key: 'mastery_5', title: 'Five-topic master', description: 'Master 5 topics', icon: 'star', category: 'Mastery', rarity: 'RARE', criteria: { metric: 'topics_mastered', target: 5 } },
    { key: 'project_mastered', title: 'Project mastered', description: 'Master every topic in a project', icon: 'gem', category: 'Mastery', rarity: 'LEGENDARY', criteria: { metric: 'project_mastered', target: 1 } },
    { key: 'exam_first', title: 'First exam simulation', description: 'Complete an exam simulation', icon: 'graduation-cap', category: 'Exam', rarity: 'COMMON', criteria: { metric: 'exams_completed', target: 1 } },
    { key: 'exam_improved', title: 'Personal best', description: 'Beat your previous exam simulation score', icon: 'trending-up', category: 'Exam', rarity: 'UNCOMMON', criteria: { metric: 'exam_beat_previous', target: 1 } },
    { key: 'exam_ready', title: 'Exam ready', description: 'Reach an exam readiness of 90% or more', icon: 'badge-check', category: 'Exam', rarity: 'EPIC', criteria: { metric: 'exam_ready', target: 1 } },
    { key: 'teach_back_1', title: 'Taught it back', description: 'Complete a teach-it-back exercise', icon: 'presentation', category: 'Learning modes', rarity: 'COMMON', criteria: { metric: 'teach_backs', target: 1 } },
    { key: 'socratic_1', title: 'Socratic thinker', description: 'Learn through a Socratic dialogue', icon: 'messages-square', category: 'Learning modes', rarity: 'COMMON', criteria: { metric: 'socratic_sessions', target: 1 } },
    { key: 'recall_10', title: 'Explained 10 concepts', description: 'Explain 10 concepts in active recall', icon: 'brain', category: 'Learning modes', rarity: 'UNCOMMON', criteria: { metric: 'recalls', target: 10 } },
    { key: 'room_joined', title: 'Study buddy', description: 'Join a study room', icon: 'users', category: 'Social', rarity: 'COMMON', criteria: { metric: 'rooms_joined', target: 1 } },
    { key: 'game_won', title: 'Quiz champion', description: 'Win a multiplayer quiz', icon: 'swords', category: 'Social', rarity: 'RARE', criteria: { metric: 'games_won', target: 1 } },
    { key: 'shared', title: 'Sharing is caring', description: 'Share a deck, quiz or project', icon: 'share-2', category: 'Social', rarity: 'COMMON', criteria: { metric: 'shares', target: 1 } },
];
