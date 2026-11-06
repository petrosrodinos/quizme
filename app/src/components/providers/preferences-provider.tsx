import { useEffect, type ReactNode } from "react";
import { usePreferences } from "@/features/preferences/hooks/use-preferences";
import { usePreferencesStore } from "@/stores/preferences";
import { initSoundEngine, setSoundVolume } from "@/lib/sound";

/** Loads server-side preferences, applies volume and the animations-off flag to <html>. */
export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
    usePreferences();
    const volume = usePreferencesStore((s) => s.volume);
    const animations = usePreferencesStore((s) => s.animations_enabled);

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
