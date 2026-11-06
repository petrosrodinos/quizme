import { BookOpen, Dumbbell, House, Trophy, UserRound, type LucideIcon } from "lucide-react";
import { Routes } from "@/routes/routes";

export interface PlayfulNavItem {
    key: "learn" | "practice" | "courses" | "quests" | "profile";
    to: string;
    icon: LucideIcon;
    /** Accent colour (CSS colour) used for the active state. */
    color: string;
    /** Path prefixes that also mark this item active. */
    prefixes?: string[];
}

/** Primary destinations of the playful shell (bottom tab bar on phones, side nav on desktop). */
export const playfulNavItems: PlayfulNavItem[] = [
    { key: "learn", to: Routes.dashboard, icon: House, color: "var(--pf-green)" },
    { key: "practice", to: Routes.study, icon: Dumbbell, color: "var(--pf-blue)" },
    { key: "courses", to: Routes.projects.root, icon: BookOpen, color: "var(--pf-purple)", prefixes: [Routes.projects.root] },
    { key: "quests", to: Routes.achievements, icon: Trophy, color: "var(--pf-orange)" },
    { key: "profile", to: Routes.profile, icon: UserRound, color: "var(--pf-red)", prefixes: [Routes.settings.root, Routes.notifications] },
];

export const isNavItemActive = (item: PlayfulNavItem, pathname: string) =>
    pathname === item.to || (item.prefixes ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
