import { ChevronsUpDown, LogOut, Moon, Settings, SlidersHorizontal, Sun, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/auth";
import { useLogout } from "@/features/auth/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { initials } from "@/lib/format";
import { Routes } from "@/routes/routes";

export function NavUser() {
    const { t } = useTranslation("layout");
    const user = useAuthStore((s) => s.user);
    const { isMobile } = useSidebar();
    const logout = useLogout();
    const { toggleTheme, getThemeIconType } = useTheme();
    const name = user?.full_name || user?.email?.split("@")[0] || t("userMenu.fallbackName");

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" aria-label={t("userMenu.aria")}>
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={user?.avatar_url || ""} alt={name} />
                                <AvatarFallback className="rounded-lg bg-primary/15 text-primary">{initials(name)}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{name}</span>
                                <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side={isMobile ? "bottom" : "right"} align="end" sideOffset={4}>
                        <DropdownMenuLabel className="font-normal">
                            <div className="text-sm font-semibold">{name}</div>
                            <div className="text-xs text-muted-foreground">{user?.email}</div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link to={Routes.settings.profile}>
                                    <Settings /> {t("userMenu.accountSettings")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to={Routes.settings.preferences}>
                                    <SlidersHorizontal /> {t("userMenu.preferences")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to={Routes.achievements}>
                                    <Trophy /> {t("userMenu.achievements")}
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={toggleTheme}>
                                {getThemeIconType() === "sun" ? <Sun /> : <Moon />} {t("userMenu.toggleTheme")}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => logout.mutate()} disabled={logout.isPending}>
                            <LogOut /> {t("common:actions.signOut")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
