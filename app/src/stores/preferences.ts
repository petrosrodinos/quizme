import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { UserPreferences } from "@/features/preferences/interfaces/preferences.interfaces";

export const DefaultPreferences: UserPreferences = {
    sound_enabled: true,
    volume: 70,
    sound_feedback: true,
    sound_celebrations: true,
    sound_timers: true,
    animations_enabled: true,
    haptics_enabled: true,
    focus_mode: false,
    leaderboard_opt_in: false,
    achievement_popups: true,
    language: "en",
    ui_mode: "classic",
    notification_prefs: {},
};

interface PreferencesStore extends UserPreferences {
    /** When true, an exam simulation is running: sounds/celebrations are suppressed. */
    exam_mode: boolean;
    setPreferences: (prefs: Partial<UserPreferences>) => void;
    setExamMode: (value: boolean) => void;
    reset: () => void;
}

const STORE_KEY = "preferences";

export const usePreferencesStore = create<PreferencesStore>()(
    devtools(
        persist(
            (set) => ({
                ...DefaultPreferences,
                exam_mode: false,
                setPreferences: (prefs) => set((state) => ({ ...state, ...prefs })),
                setExamMode: (value) => set({ exam_mode: value }),
                reset: () => set({ ...DefaultPreferences, exam_mode: false }),
            }),
            {
                name: STORE_KEY,
                partialize: (state) => {
                    const { exam_mode: _exam, setPreferences: _s, setExamMode: _e, reset: _r, ...rest } = state;
                    return rest;
                },
            },
        ),
        { name: STORE_KEY },
    ),
);

export const getPreferencesStoreState = () => usePreferencesStore.getState();
