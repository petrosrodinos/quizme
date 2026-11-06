import { useEffect, type ReactNode } from "react";
import { usePreferences } from "@/features/preferences/hooks/use-preferences";
import { usePreferencesStore } from "@/stores/preferences";
import { initSoundEngine, setSoundVolume } from "@/lib/sound";
import { setThemeUiMode } from "@/hooks/use-theme";
import { useUiMode } from "@/hooks/use-ui-mode";

/** Loads server-side preferences, applies volume, the UI mode and the animations-off flag to <html>. */
export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
    usePreferences();
    const volume = usePreferencesStore((s) => s.volume);
    const animations = usePreferencesStore((s) => s.animations_enabled);
    const uiMode = useUiMode();

    useEffect(() => {
        setThemeUiMode(uiMode);
    }, [uiMode]);

    useEffect(() => {
        initSoundEngine();
    }, []);

    useEffect(() => {
        setSoundVolume(volume / 100);
    }, [volume]);

    useEffect(() => {
        document.documentElement.dataset.reduceMotion = animations ? "false" : "true";
    }, [animations]);

    return <>{children}</>;
};
