import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import type { NavGroup as NavGroupType, NavLink } from "./types";

const isActive = (pathname: string, item: NavLink) =>
    pathname === item.url || (item.matchPrefix && pathname.startsWith(`${item.url}/`));

export function NavGroup({ title, items }: NavGroupType) {
    const { pathname } = useLocation();
    const { setOpenMobile } = useSidebar();
    return (
        <SidebarGroup>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={isActive(pathname, item)} tooltip={item.title}>
                            <Link to={item.url} onClick={() => setOpenMobile(false)}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                {item.badge && <Badge className="ml-auto rounded-full px-1.5 py-0 text-[10px]">{item.badge}</Badge>}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
