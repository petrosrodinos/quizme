import { useCallback } from "react";
import { usePreferencesStore } from "@/stores/preferences";
import { useCelebrationsStore } from "@/stores/celebrations";
import { playSound, SoundCategories, vibrate, type HapticPattern, type PlayOptions, type SoundName } from "@/lib/sound";
import { shouldReduceMotion } from "@/lib/motion";

/**
 * Central feedback channel for sounds, haptics and XP popups. Honours user preferences, Focus Mode
 * and exam mode. Sound is never the only feedback channel — callers always render a visual state too.
 */
export const useFeedback = () => {
    const prefs = usePreferencesStore();
    const pushXp = useCelebrationsStore((s) => s.pushXp);

    const canPlay = useCallback(
        (name: SoundName) => {
            if (!prefs.sound_enabled || prefs.focus_mode || prefs.exam_mode) return false;
            const category = SoundCategories[name];
            if (category === "feedback") return prefs.sound_feedback;
            if (category === "celebrations") return prefs.sound_celebrations;
            return prefs.sound_timers;
        },
        [prefs.sound_enabled, prefs.focus_mode, prefs.exam_mode, prefs.sound_feedback, prefs.sound_celebrations, prefs.sound_timers],
    );

    const play = useCallback(
        (name: SoundName, opts?: PlayOptions) => {
            if (canPlay(name)) playSound(name, opts);
        },
        [canPlay],
    );

    const haptic = useCallback(
        (pattern: HapticPattern) => {
            if (prefs.haptics_enabled && !prefs.focus_mode && !prefs.exam_mode) vibrate(pattern);
        },
        [prefs.haptics_enabled, prefs.focus_mode, prefs.exam_mode],
    );

    /** Shows a floating "+N XP" near an element (skipped in focus mode). */
    const showXp = useCallback(
        (amount: number, anchor?: Element | null) => {
            if (!amount || prefs.focus_mode || prefs.exam_mode) return;
            const rect = anchor?.getBoundingClientRect();
            pushXp(amount, rect ? { x: rect.left + rect.width / 2, y: rect.top } : undefined);
        },
        [prefs.focus_mode, prefs.exam_mode, pushXp],
    );

    return {
        play,
        haptic,
        showXp,
        reduceMotion: shouldReduceMotion(prefs),
        focusMode: prefs.focus_mode,
        showCombos: !prefs.focus_mode && !prefs.exam_mode,
    };
};
