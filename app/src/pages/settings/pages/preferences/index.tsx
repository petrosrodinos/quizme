import { Languages, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useTheme } from "@/hooks/use-theme";
import { useFeedback } from "@/hooks/use-feedback";
import { usePreferencesStore } from "@/stores/preferences";
import { changeLanguage, currentLanguage, type SupportedLanguage } from "@/i18n";
import { LanguageOptions } from "@/config/constants/dropdowns/shared/language.options";
import { PreferenceToggleOptions, SoundPreviewOptions, ThemeOptions } from "@/config/constants/dropdowns/preferences/preference.options";
import { usePreferences, useSyncLanguageChoice, useUpdatePreferences } from "@/features/preferences/hooks/use-preferences";
import type { UpdatePreferencesDto, UserPreferences } from "@/features/preferences/interfaces/preferences.interfaces";
import { SettingsSection, ToggleRow } from "../../components/settings-section";
import { AiUsageCard } from "./components/ai-usage-card";

type BoolKey = keyof typeof PreferenceToggleOptions;

export default function SettingsPreferencesPage() {
    const { t, i18n } = useTranslation("settings");
    usePageMetadata({ title: t("preferences.pageTitle") });
    const { isPending } = usePreferences();
    const prefs = usePreferencesStore();
    const update = useUpdatePreferences({ silent: true });
    const syncLanguage = useSyncLanguageChoice();
    const { theme, setTheme } = useTheme();
    const { play } = useFeedback();
    const language = currentLanguage(i18n.resolvedLanguage);

    const set = (dto: UpdatePreferencesDto) => update.mutate(dto);
    const onLanguageChange = (value: string) => {
        const lng = value as SupportedLanguage;
        void changeLanguage(lng);
        syncLanguage(lng);
    };
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
            <SettingsSection title={t("preferences.language.title")} description={t("preferences.language.description")}>
                <div className="flex items-center justify-between gap-4">
                    <label htmlFor="language-select" className="inline-flex items-center gap-2 text-sm font-medium">
                        <Languages className="h-4 w-4" aria-hidden /> {t("common:language.label")}
                    </label>
                    <Select value={language} onValueChange={onLanguageChange}>
                        <SelectTrigger id="language-select" className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {LanguageOptions.map((o) => (
                                <SelectItem key={o.id} value={o.id} lang={o.id}>
                                    {o.nativeName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </SettingsSection>

            <SettingsSection title={t("preferences.focus.title")} description={t("preferences.focus.description")}>
                <div className="divide-y divide-border">{toggle("focus_mode")}</div>
            </SettingsSection>

            <SettingsSection title={t("preferences.sound.title")} description={t("preferences.sound.description")}>
                <div className="divide-y divide-border">
                    <ToggleRow
                        id="pref-sound_enabled"
                        label={t("preferences.sound.master")}
                        description={t("preferences.sound.masterDescription")}
                        control={<Switch id="pref-sound_enabled" checked={prefs.sound_enabled} onCheckedChange={(c) => set({ sound_enabled: c })} />}
                    />
                    <div className="py-3">
                        <label htmlFor="pref-volume" className="mb-2 flex items-center justify-between text-sm font-medium">
                            <span className="inline-flex items-center gap-2">
                                <Volume2 className="h-4 w-4" aria-hidden /> {t("preferences.sound.volume")}
                            </span>
                            <span className="tabular-nums text-muted-foreground">{t("common:units.percent", { value: prefs.volume })}</span>
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
                        <div className="mb-2 text-xs text-muted-foreground">{t("preferences.sound.preview")}</div>
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

            <SettingsSection title={t("preferences.motion")}>
                <div className="divide-y divide-border">
                    {toggle("animations_enabled")}
                    {toggle("haptics_enabled")}
                    {toggle("achievement_popups")}
                </div>
            </SettingsSection>

            <SettingsSection title={t("preferences.social")}>
                <div className="divide-y divide-border">{toggle("leaderboard_opt_in")}</div>
            </SettingsSection>

            <SettingsSection title={t("preferences.appearance")}>
                <div className="flex items-center justify-between gap-4">
                    <label htmlFor="theme-select" className="text-sm font-medium">
                        {t("preferences.themeLabel")}
                    </label>
                    <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                        <SelectTrigger id="theme-select" className="w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ThemeOptions.map((o) => (
                                <SelectItem key={o.id} value={o.id}>
                                    {o.label}
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
