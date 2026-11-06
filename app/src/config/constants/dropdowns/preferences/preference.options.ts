import { tOption, tr } from "@/lib/i18n-options";
import type { SoundName } from "@/lib/sound";

export const ThemeOptions: { id: "light" | "dark" | "system"; label: string }[] = [
    tOption("system", "settings:theme.system"),
    tOption("light", "settings:theme.light"),
    tOption("dark", "settings:theme.dark"),
];

export const SoundPreviewOptions: { id: SoundName; label: string }[] = [
    tOption("correct", "settings:sounds.correct"),
    tOption("wrong", "settings:sounds.wrong"),
    tOption("flip", "settings:sounds.flip"),
    tOption("levelUp", "settings:sounds.levelUp"),
    tOption("achievement", "settings:sounds.achievement"),
    tOption("timerTick", "settings:sounds.timerTick"),
];

const toggle = (key: string) => ({
    get label(): string {
        return tr(`settings:toggles.${key}.label`);
    },
    get description(): string {
        return tr(`settings:toggles.${key}.description`);
    },
});

export const PreferenceToggleOptions = {
    sound_feedback: toggle("sound_feedback"),
    sound_celebrations: toggle("sound_celebrations"),
    sound_timers: toggle("sound_timers"),
    animations_enabled: toggle("animations_enabled"),
    haptics_enabled: toggle("haptics_enabled"),
    focus_mode: toggle("focus_mode"),
    achievement_popups: toggle("achievement_popups"),
    leaderboard_opt_in: toggle("leaderboard_opt_in"),
};

/** AI usage task labels; unknown tasks fall back to a humanised identifier. */
export const getAiTaskLabel = (task: string) => {
    const exact = task.split(":")[0];
    const family = /^(summary|text|notes)_/.exec(exact)?.[1];
    const base = family ? `${family}_` : exact;
    const humanised = task
        .replace(/[_:]+/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase())
        .trim();
    return tr(`settings:aiTasks.${base.replace(/_$/, "_any")}`, { defaultValue: humanised });
};
