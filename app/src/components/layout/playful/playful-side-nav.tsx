import { Link, useLocation } from "react-router-dom";
import { Bell, Inbox, LogOut, MoreHorizontal, Search, Settings, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mascot } from "@/components/ui/mascot";
import { useLogout } from "@/features/auth/hooks/use-auth";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-notification-count";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { isNavItemActive, playfulNavItems } from "./nav-items";

const itemClass =
    "flex h-12 items-center justify-center gap-4 rounded-xl border-2 border-transparent px-3 text-[15px] font-extrabold uppercase tracking-wide transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:justify-start";

/** Desktop navigation rail (icons at lg, icons + labels at xl), Duolingo-web style. */
export const PlayfulSideNav = () => {
    const { t } = useTranslation("playful");
    const { pathname } = useLocation();
    const logout = useLogout();
    const { data: unread } = useUnreadNotificationCount();

    return (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[88px] flex-col border-r-2 border-border bg-background px-3 py-6 lg:flex xl:w-64 xl:px-4">
            <Link to={Routes.dashboard} className="mb-6 flex items-center justify-center gap-2 xl:justify-start xl:px-3" aria-label={environments.APP_NAME}>
                <Mascot pose="wave" className="size-10" />
                <span className="hidden text-[28px] font-black tracking-tight text-[var(--pf-green)] xl:inline">{environments.APP_NAME.toLowerCase()}</span>
            </Link>

            <nav aria-label={t("nav.primary")} className="flex flex-1 flex-col gap-2">
                {playfulNavItems.map((item) => {
                    const active = isNavItemActive(item, pathname);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.key}
                            to={item.to}
                            aria-current={active ? "page" : undefined}
                            title={t(`nav.${item.key}`)}
                            className={cn(itemClass, !active && "text-muted-foreground")}
                            style={active ? { color: item.color, borderColor: item.color, background: `color-mix(in srgb, ${item.color} 12%, transparent)` } : undefined}
                        >
                            <Icon className="size-7 shrink-0" strokeWidth={2.4} style={{ color: item.color }} />
                            <span className="hidden xl:inline">{t(`nav.${item.key}`)}</span>
                        </Link>
                    );
                })}

                <DropdownMenu>
                    <DropdownMenuTrigger className={cn(itemClass, "text-muted-foreground")} title={t("nav.more")}>
                        <span className="relative">
                            <MoreHorizontal className="size-7 shrink-0" strokeWidth={2.4} />
                            {!!unread?.count && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-background bg-[var(--pf-red)]" aria-hidden />}
                        </span>
                        <span className="hidden xl:inline">{t("nav.more")}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="end" className="w-60 rounded-2xl border-2 p-2 font-bold">
                        <DropdownMenuItem asChild className="gap-3 rounded-xl py-2.5">
                            <Link to={Routes.rooms.root}>
                                <Users /> {t("nav.rooms")}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-3 rounded-xl py-2.5">
                            <Link to={Routes.search}>
                                <Search /> {t("nav.search")}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-3 rounded-xl py-2.5">
                            <Link to={Routes.notifications}>
                                <Bell /> {t("nav.notifications")}
                                {!!unread?.count && <span className="ml-auto rounded-full bg-[var(--pf-red)] px-2 text-xs text-white">{unread.count > 99 ? "99+" : unread.count}</span>}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-3 rounded-xl py-2.5">
                            <Link to={Routes.invitations}>
                                <Inbox /> {t("nav.invitations")}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-3 rounded-xl py-2.5">
                            <Link to={Routes.settings.root}>
                                <Settings /> {t("nav.settings")}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-3 rounded-xl py-2.5 text-destructive" onSelect={() => logout.mutate()}>
                            <LogOut /> {t("nav.signOut")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </nav>
        </aside>
    );
};

/** Secondary destinations, listed on the profile page on phones (no "More" menu there). */
export const PlayfulMoreLinks = [
    { key: "rooms", to: Routes.rooms.root, icon: Users },
    { key: "search", to: Routes.search, icon: Search },
    { key: "notifications", to: Routes.notifications, icon: Bell },
    { key: "invitations", to: Routes.invitations, icon: Inbox },
    { key: "settings", to: Routes.settings.root, icon: Settings },
] as const;

