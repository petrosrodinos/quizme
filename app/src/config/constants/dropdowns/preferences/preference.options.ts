import type { SoundName } from "@/lib/sound";

export const ThemeOptions: { id: "light" | "dark" | "system"; label: string }[] = [
    { id: "system", label: "Match system" },
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
];

export const SoundPreviewOptions: { id: SoundName; label: string }[] = [
    { id: "correct", label: "Correct" },
    { id: "wrong", label: "Wrong" },
    { id: "flip", label: "Card flip" },
    { id: "levelUp", label: "Level up" },
    { id: "achievement", label: "Achievement" },
    { id: "timerTick", label: "Timer" },
];

export const PreferenceToggleOptions = {
    sound_feedback: { label: "Answer feedback", description: "Correct / wrong sounds, card flips, XP ticks" },
    sound_celebrations: { label: "Celebrations", description: "Level up, achievements, daily goal" },
    sound_timers: { label: "Timers", description: "Exam countdown ticks and study-room timers" },
    animations_enabled: { label: "Animations", description: "Motion for feedback and celebrations (always reduced if your OS asks)" },
    haptics_enabled: { label: "Haptic feedback", description: "Vibration on supported mobile devices" },
    focus_mode: { label: "Focus mode", description: "Hide celebrations, sounds, combos and XP popups. Progress is still tracked." },
    achievement_popups: { label: "Achievement popups", description: "Show a toast or modal when you unlock an achievement" },
    leaderboard_opt_in: { label: "Appear on leaderboards", description: "Let collaborators see your weekly XP in shared projects" },
} as const;

export const getAiTaskLabel = (task: string) =>
    task
        .replace(/[_:]+/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase())
        .trim();
