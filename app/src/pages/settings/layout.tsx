import { NavLink, Outlet } from "react-router-dom";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";

const tabs = [
    { label: "Profile", to: Routes.settings.profile },
    { label: "Preferences", to: Routes.settings.preferences },
    { label: "Notifications", to: Routes.settings.notifications },
    { label: "Sessions & security", to: Routes.settings.sessions },
];

export default function SettingsLayout() {
    return (
        <Main width="narrow">
            <PageHeader title="Settings" description="Manage your account, study preferences and security." />
            <nav aria-label="Settings sections" className="scrollbar-none mb-6 flex gap-1 overflow-x-auto border-b border-border">
                {tabs.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        className={({ isActive }) =>
                            cn(
                                "shrink-0 whitespace-nowrap border-b-2 px-3 pb-2.5 text-sm font-medium",
                                isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                            )
                        }
                    >
                        {t.label}
                    </NavLink>
                ))}
            </nav>
            <Outlet />
        </Main>
    );
}
