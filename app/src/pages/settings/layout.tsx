import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";

const tabs = [
    { labelKey: "settings:tabs.profile", to: Routes.settings.profile },
    { labelKey: "settings:tabs.preferences", to: Routes.settings.preferences },
    { labelKey: "settings:tabs.notifications", to: Routes.settings.notifications },
    { labelKey: "settings:tabs.sessions", to: Routes.settings.sessions },
];

export default function SettingsLayout() {
    const { t } = useTranslation("settings");
    return (
        <Main width="narrow">
            <PageHeader title={t("title")} description={t("description")} />
            <nav aria-label={t("sectionsAria")} className="scrollbar-none mb-6 flex gap-1 overflow-x-auto border-b border-border">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        className={({ isActive }) =>
                            cn(
                                "shrink-0 whitespace-nowrap border-b-2 px-3 pb-2.5 text-sm font-medium",
                                isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                            )
                        }
                    >
                        {t(tab.labelKey)}
                    </NavLink>
                ))}
            </nav>
            <Outlet />
        </Main>
    );
}
