import { useCallback } from "react";
import { usePreferencesStore } from "@/stores/preferences";
import { useUpdatePreferences } from "@/features/preferences/hooks/use-preferences";
import { UiModes, type UiMode } from "@/features/preferences/interfaces/preferences.interfaces";

/** Current UI mode ("playful" mobile-first UI or the original "classic" UI). */
export const useUiMode = (): UiMode => usePreferencesStore((s) => (s.ui_mode === UiModes.CLASSIC ? UiModes.CLASSIC : UiModes.PLAYFUL));

export const useIsPlayful = () => useUiMode() === UiModes.PLAYFUL;

/** Switches the UI mode (applied instantly, persisted server-side so it follows the user across devices). */
export const useSetUiMode = () => {
    const update = useUpdatePreferences({ silent: true });
    const mutate = update.mutate;
    return useCallback((mode: UiMode) => mutate({ ui_mode: mode }), [mutate]);
};
