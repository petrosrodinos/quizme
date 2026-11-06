import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { GamificationStrip } from "@/components/layout/gamification-strip";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PreferencesMenu } from "@/components/layout/preferences-menu";
import { useSyncLanguageChoice } from "@/features/preferences/hooks/use-preferences";

/** Sticky top bar of the authenticated shell. */
export const Header = () => {
    const { t } = useTranslation("layout");
    const syncLanguage = useSyncLanguageChoice();
    return (
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-5">
            <SidebarTrigger variant="ghost" aria-label={t("header.toggleSidebar")} />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1" />
            <GamificationStrip />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <div className="flex items-center gap-1">
                <NotificationBell />
                <PreferencesMenu onLanguageChange={syncLanguage} />
            </div>
        </header>
    );
};
