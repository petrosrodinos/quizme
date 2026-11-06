import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { GamificationStrip } from "@/components/layout/gamification-strip";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Routes } from "@/routes/routes";

/** Sticky top bar of the authenticated shell. */
export const Header = () => (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-5">
        <SidebarTrigger variant="ghost" aria-label="Toggle sidebar" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1" />
        <GamificationStrip />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <Button variant="ghost" size="icon" asChild>
            <Link to={Routes.search} aria-label="Search">
                <Search />
            </Link>
        </Button>
        <NotificationBell />
    </header>
);
