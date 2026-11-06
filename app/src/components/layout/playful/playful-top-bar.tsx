import { NotificationBell } from "@/components/layout/notification-bell";
import { cn } from "@/lib/utils";
import { CourseSwitcher } from "./course-switcher";
import { PlayfulStats } from "./playful-stats";

/** Header: current course, streak, XP, level and notifications. Hidden on wide desktop when the right rail shows these. */
export const PlayfulTopBar = ({ hideOnWide }: { hideOnWide?: boolean }) => (
    <header
        className={cn(
            "sticky top-0 z-40 border-b-2 border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/85",
            hideOnWide && "xl:hidden",
        )}
    >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-3">
            <CourseSwitcher />
            <PlayfulStats />
            <NotificationBell />
        </div>
    </header>
);
