import { Bell, BookOpenCheck, FolderKanban, LayoutDashboard, Search, Settings, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";
import { NavGroup } from "@/components/layout/nav-group";
import { NavUser } from "@/components/layout/nav-user";
import { Routes } from "@/routes/routes";
import { environments } from "@/config/environments";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-notification-count";
import type { NavGroup as NavGroupType } from "./types";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const { t } = useTranslation("layout");
    const { data: unread } = useUnreadNotificationCount();
    const unreadBadge = unread?.count ? (unread.count > 99 ? "99+" : String(unread.count)) : undefined;

    const groups: NavGroupType[] = [
        {
            title: t("nav.groups.learn"),
            items: [
                { title: t("nav.dashboard"), url: Routes.dashboard, icon: LayoutDashboard },
                { title: t("nav.todaysStudy"), url: Routes.study, icon: BookOpenCheck },
                { title: t("nav.projects"), url: Routes.projects.root, icon: FolderKanban, matchPrefix: true },
                { title: t("nav.studyRooms"), url: Routes.rooms.root, icon: Users, matchPrefix: true },
            ],
        },
        {
            title: t("nav.groups.explore"),
            items: [
                { title: t("nav.search"), url: Routes.search, icon: Search },
                { title: t("nav.achievements"), url: Routes.achievements, icon: Trophy },
            ],
        },
        {
            title: t("nav.groups.account"),
            items: [
                { title: t("nav.notifications"), url: Routes.notifications, icon: Bell, badge: unreadBadge },
                { title: t("nav.settings"), url: Routes.settings.root, icon: Settings, matchPrefix: true },
            ],
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="floating" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to={Routes.dashboard} aria-label={t("nav.home", { app: environments.APP_NAME })}>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <img src="/favicon.svg" alt="" className="size-8 rounded-lg" />
                                </div>
                                <div className="grid flex-1 text-left leading-tight">
                                    <span className="font-display text-lg">{environments.APP_NAME}</span>
                                    <span className="text-[11px] text-muted-foreground">{t("common:tagline")}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {groups.map((g) => (
                    <NavGroup key={g.title} {...g} />
                ))}
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
