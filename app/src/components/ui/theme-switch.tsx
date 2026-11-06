import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";

/** One-click light/dark toggle. "System" stays available in Settings → Preferences. */
export function ThemeSwitch() {
    const { t } = useTranslation("ui");
    const { resolvedTheme, toggleTheme } = useTheme();
    const label = resolvedTheme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark");

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={label} className="relative">
                        <Sun className="rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0" aria-hidden />
                        <Moon className="absolute rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100" aria-hidden />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
