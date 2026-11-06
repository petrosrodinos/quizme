import { tr } from "@/lib/i18n-options";

/** Achievement keys defined server-side (api/src/modules/gamification/gamification.config.ts). */
export const AchievementKeys = [
    "streak_3",
    "streak_7",
    "streak_14",
    "streak_30",
    "streak_60",
    "streak_100",
    "streak_365",
    "early_bird",
    "weekend_warrior",
    "questions_100",
    "questions_1000",
    "cards_100",
    "cards_1000",
    "perfect_quiz",
    "combo_10",
    "comeback_20",
    "mastery_1",
    "mastery_5",
    "project_mastered",
    "exam_first",
    "exam_improved",
    "exam_ready",
    "teach_back_1",
    "socratic_1",
    "recall_10",
    "room_joined",
    "game_won",
    "shared",
] as const;

const known = new Set<string>(AchievementKeys);

/**
 * Localised achievement title/description. Server sends English text; known keys are translated,
 * unknown keys fall back to the server text. Locked hidden achievements use the "secret" copy.
 */
export const getAchievementText = (a: { key: string; title: string; description: string; hidden?: boolean; unlocked?: boolean }) => {
    if (a.hidden && a.unlocked === false) {
        return { title: tr("gamification:achievements.secret.title"), description: tr("gamification:achievements.secret.description") };
    }
    if (!known.has(a.key)) return { title: a.title, description: a.description };
    return {
        title: tr(`gamification:achievements.${a.key}.title`, { defaultValue: a.title }),
        description: tr(`gamification:achievements.${a.key}.description`, { defaultValue: a.description }),
    };
};

/** Achievement category label (server sends English category names). */
export const getAchievementCategoryLabel = (category: string) => {
    const key = category.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
    return tr(`gamification:categories.${key}`, { defaultValue: category });
};
