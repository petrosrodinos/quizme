import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { changeLanguage, currentLanguage, type SupportedLanguage } from "@/i18n";
import { LanguageOptions } from "@/config/constants/dropdowns/shared/language.options";

interface LanguageSwitcherProps {
    /** "icon" renders a compact icon button (header); "full" shows the current language name. */
    variant?: "icon" | "full";
    className?: string;
    /** Called after the language changes (e.g. to persist it to the server). */
    onChange?: (language: SupportedLanguage) => void;
}

/** UI language picker (English / Ελληνικά). The choice is cached in localStorage by the i18n detector. */
export const LanguageSwitcher = ({ variant = "icon", className, onChange }: LanguageSwitcherProps) => {
    const { t, i18n } = useTranslation();
    const active = currentLanguage(i18n.resolvedLanguage);
    const activeOption = LanguageOptions.find((o) => o.id === active);

    const select = async (language: SupportedLanguage) => {
        if (language === active) return;
        await changeLanguage(language);
        onChange?.(language);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {variant === "icon" ? (
                    <Button variant="ghost" size="icon" className={className} aria-label={t("language.change")}>
                        <Languages />
                    </Button>
                ) : (
                    <Button variant="outline" className={cn("justify-between gap-2", className)} aria-label={t("language.change")}>
                        <span className="flex items-center gap-2">
                            <Languages className="h-4 w-4" aria-hidden />
                            {activeOption?.nativeName}
                        </span>
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {LanguageOptions.map((option) => (
                    <DropdownMenuItem key={option.id} onSelect={() => void select(option.id)} lang={option.id}>
                        <span className="flex-1">{option.nativeName}</span>
                        {option.id === active && <Check className="h-4 w-4" aria-hidden />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
