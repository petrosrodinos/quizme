import { Bell, BookOpenCheck, FolderKanban, LayoutDashboard, Search, Settings, Trophy, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar";
import { NavGroup } from "@/components/layout/nav-group";
import { NavUser } from "@/components/layout/nav-user";
import { Routes } from "@/routes/routes";
import { environments } from "@/config/environments";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-notification-count";
import type { NavGroup as NavGroupType } from "./types";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const { data: unread } = useUnreadNotificationCount();
    const unreadBadge = unread?.count ? (unread.count > 99 ? "99+" : String(unread.count)) : undefined;

    const groups: NavGroupType[] = [
        {
            title: "Learn",
            items: [
                { title: "Dashboard", url: Routes.dashboard, icon: LayoutDashboard },
                { title: "Today's Study", url: Routes.study, icon: BookOpenCheck },
                { title: "Projects", url: Routes.projects.root, icon: FolderKanban, matchPrefix: true },
                { title: "Study Rooms", url: Routes.rooms.root, icon: Users, matchPrefix: true },
            ],
        },
        {
            title: "Explore",
            items: [
                { title: "Search", url: Routes.search, icon: Search },
                { title: "Achievements", url: Routes.achievements, icon: Trophy },
            ],
        },
        {
            title: "Account",
            items: [
                { title: "Notifications", url: Routes.notifications, icon: Bell, badge: unreadBadge },
                { title: "Settings", url: Routes.settings.root, icon: Settings, matchPrefix: true },
            ],
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="floating" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to={Routes.dashboard} aria-label={`${environments.APP_NAME} home`}>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <img src="/favicon.svg" alt="" className="size-8 rounded-lg" />
                                </div>
                                <div className="grid flex-1 text-left leading-tight">
                                    <span className="font-display text-lg">{environments.APP_NAME}</span>
                                    <span className="text-[11px] text-muted-foreground">Personal learning system</span>
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
