import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useTheme } from "@/hooks/use-theme";
import { useFeedback } from "@/hooks/use-feedback";
import { usePreferencesStore } from "@/stores/preferences";
import { PreferenceToggleOptions, SoundPreviewOptions, ThemeOptions } from "@/config/constants/dropdowns/preferences/preference.options";
import { usePreferences, useUpdatePreferences } from "@/features/preferences/hooks/use-preferences";
import type { UpdatePreferencesDto, UserPreferences } from "@/features/preferences/interfaces/preferences.interfaces";
import { SettingsSection, ToggleRow } from "../../components/settings-section";
import { AiUsageCard } from "./components/ai-usage-card";

type BoolKey = keyof typeof PreferenceToggleOptions;

export default function SettingsPreferencesPage() {
    usePageMetadata({ title: "Preferences" });
    const { isPending } = usePreferences();
    const prefs = usePreferencesStore();
    const update = useUpdatePreferences({ silent: true });
    const { theme, setTheme } = useTheme();
    const { play } = useFeedback();

    const set = (dto: UpdatePreferencesDto) => update.mutate(dto);
    const toggle = (key: BoolKey, disabled = false) => (
        <ToggleRow
            key={key}
            id={`pref-${key}`}
            label={PreferenceToggleOptions[key].label}
            description={PreferenceToggleOptions[key].description}
            control={
                <Switch
                    id={`pref-${key}`}
                    aria-describedby={`pref-${key}-desc`}
                    checked={Boolean(prefs[key as keyof UserPreferences])}
                    disabled={disabled}
                    onCheckedChange={(checked) => set({ [key]: checked } as UpdatePreferencesDto)}
                />
            }
        />
    );

    if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;

    return (
        <div className="space-y-6">
            <SettingsSection title="Focus" description="Gamification should never get in the way of serious study.">
                <div className="divide-y divide-border">{toggle("focus_mode")}</div>
            </SettingsSection>

            <SettingsSection title="Sound" description="Short, gentle sounds generated in your browser. Sounds are always off during exam simulations.">
                <div className="divide-y divide-border">
                    <ToggleRow
                        id="pref-sound_enabled"
                        label="Sound effects"
                        description="Master switch for all sounds"
                        control={<Switch id="pref-sound_enabled" checked={prefs.sound_enabled} onCheckedChange={(c) => set({ sound_enabled: c })} />}
                    />
                    <div className="py-3">
                        <label htmlFor="pref-volume" className="mb-2 flex items-center justify-between text-sm font-medium">
                            <span className="inline-flex items-center gap-2">
                                <Volume2 className="h-4 w-4" aria-hidden /> Volume
                            </span>
                            <span className="tabular-nums text-muted-foreground">{prefs.volume}%</span>
                        </label>
                        <input
                            id="pref-volume"
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={prefs.volume}
                            disabled={!prefs.sound_enabled}
                            onChange={(e) => usePreferencesStore.getState().setPreferences({ volume: Number(e.target.value) })}
                            onPointerUp={(e) => set({ volume: Number((e.target as HTMLInputElement).value) })}
                            onKeyUp={(e) => set({ volume: Number((e.target as HTMLInputElement).value) })}
                            className="w-full accent-[var(--primary)] disabled:opacity-50"
                        />
                    </div>
                    {toggle("sound_feedback", !prefs.sound_enabled)}
                    {toggle("sound_celebrations", !prefs.sound_enabled)}
                    {toggle("sound_timers", !prefs.sound_enabled)}
                    <div className="pt-3">
                        <div className="mb-2 text-xs text-muted-foreground">Preview</div>
                        <div className="flex flex-wrap gap-2">
                            {SoundPreviewOptions.map((s) => (
                                <Button key={s.id} size="sm" variant="outline" disabled={!prefs.sound_enabled || prefs.focus_mode} onClick={() => play(s.id, { combo: 3 })}>
                                    {s.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Motion & feedback">
                <div className="divide-y divide-border">
                    {toggle("animations_enabled")}
                    {toggle("haptics_enabled")}
                    {toggle("achievement_popups")}
                </div>
            </SettingsSection>

            <SettingsSection title="Social">
                <div className="divide-y divide-border">{toggle("leaderboard_opt_in")}</div>
            </SettingsSection>

            <SettingsSection title="Appearance">
                <div className="flex items-center justify-between gap-4">
                    <label htmlFor="theme-select" className="text-sm font-medium">
                        Theme
                    </label>
                    <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                        <SelectTrigger id="theme-select" className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ThemeOptions.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </SettingsSection>

            <AiUsageCard />
        </div>
    );
}
