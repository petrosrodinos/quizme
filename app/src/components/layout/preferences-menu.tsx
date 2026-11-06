import { Languages, Monitor, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { changeLanguage, currentLanguage, type SupportedLanguage } from "@/i18n";
import { LanguageOptions } from "@/config/constants/dropdowns/shared/language.options";

interface PreferencesMenuProps {
    /** Called after the language changes (e.g. to persist it to the server). */
    onLanguageChange?: (language: SupportedLanguage) => void;
}

/** Single header entry point for quick display preferences: theme + interface language. */
export const PreferencesMenu = ({ onLanguageChange }: PreferencesMenuProps) => {
    const { t, i18n } = useTranslation("layout");
    const { t: tUi } = useTranslation("ui");
    const { t: tCommon } = useTranslation("common");
    const { theme, setTheme } = useTheme();
    const active = currentLanguage(i18n.resolvedLanguage);

    const selectLanguage = async (value: string) => {
        const language = value as SupportedLanguage;
        if (language === active) return;
        await changeLanguage(language);
        onLanguageChange?.(language);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("header.preferences")}>
                    <SlidersHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel>{tUi("theme.toggle")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                    <DropdownMenuRadioItem value="light">
                        <Sun className="mr-2 h-4 w-4" aria-hidden />
                        {tUi("theme.light")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                        <Moon className="mr-2 h-4 w-4" aria-hidden />
                        {tUi("theme.dark")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                        <Monitor className="mr-2 h-4 w-4" aria-hidden />
                        {tUi("theme.system")}
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-2">
                    <Languages className="h-4 w-4" aria-hidden />
                    {tCommon("language.label")}
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup value={active} onValueChange={(v) => void selectLanguage(v)}>
                    {LanguageOptions.map((option) => (
                        <DropdownMenuRadioItem key={option.id} value={option.id} lang={option.id}>
                            {option.nativeName}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
