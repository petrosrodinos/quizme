/** True when the OS asks for reduced motion. */
export const prefersReducedMotion = (): boolean =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** True when animations should be suppressed (OS setting, user preference or focus mode). */
export const shouldReduceMotion = (prefs?: { animations_enabled?: boolean; focus_mode?: boolean }): boolean =>
    prefersReducedMotion() || prefs?.animations_enabled === false || prefs?.focus_mode === true;
