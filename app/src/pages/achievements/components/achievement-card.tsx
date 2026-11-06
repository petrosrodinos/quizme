import type { FC } from "react";
import {
    Award,
    BadgeCheck,
    Brain,
    Calendar,
    Crown,
    Flame,
    Gem,
    GraduationCap,
    Layers,
    ListChecks,
    Lock,
    MessagesSquare,
    Presentation,
    RotateCcw,
    Share2,
    Star,
    Sunrise,
    Swords,
    TrendingUp,
    Trophy,
    Users,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getAchievementText } from "@/config/constants/dropdowns/gamification/achievement-text.options";
import { formatDate } from "@/lib/date";
import { getAchievementRarityLabel } from "@/config/constants/dropdowns/gamification/achievement-rarity.options";
import type { Achievement, AchievementRarity } from "@/features/gamification/interfaces/gamification.interfaces";

const ICONS: Record<string, typeof Award> = {
    flame: Flame,
    crown: Crown,
    sunrise: Sunrise,
    calendar: Calendar,
    "list-checks": ListChecks,
    layers: Layers,
    trophy: Trophy,
    zap: Zap,
    "rotate-ccw": RotateCcw,
    star: Star,
    gem: Gem,
    "graduation-cap": GraduationCap,
    "trending-up": TrendingUp,
    "badge-check": BadgeCheck,
    presentation: Presentation,
    "messages-square": MessagesSquare,
    brain: Brain,
    users: Users,
    swords: Swords,
    "share-2": Share2,
    lock: Lock,
};

export const achievementIcon = (name: string) => ICONS[name] ?? Award;

/** Visual styling per rarity (labels come from the dropdown vocabulary). */
const RARITY_STYLE: Record<AchievementRarity, string> = {
    COMMON: "bg-surface-card text-foreground",
    UNCOMMON: "bg-teal/15 text-teal",
    RARE: "bg-chart-3/15 text-chart-3",
    EPIC: "bg-primary/15 text-primary",
    LEGENDARY: "bg-amber/20 text-amber",
};

export const AchievementCard: FC<{ achievement: Achievement }> = ({ achievement: a }) => {
    const { t } = useTranslation("achievements");
    const text = getAchievementText(a);
    const Icon = achievementIcon(a.icon);
    const pct = Math.min(100, Math.round((a.progress / Math.max(1, a.target)) * 100));
    return (
        <li
            className={cn("flex gap-4 rounded-xl border bg-card p-4", a.unlocked ? "border-border" : "border-dashed border-border/80")}
            aria-label={a.unlocked ? t("card.ariaUnlocked", { title: text.title }) : t("card.ariaLocked", { title: text.title, progress: a.progress, target: a.target })}
        >
            <div
                className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                    a.unlocked ? RARITY_STYLE[a.rarity] : "bg-muted text-muted-foreground/60 grayscale",
                    a.unlocked && a.rarity === "LEGENDARY" && "animate-shine",
                )}
            >
                <Icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn("font-medium", !a.unlocked && "text-muted-foreground")}>{text.title}</h3>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", RARITY_STYLE[a.rarity])}>{getAchievementRarityLabel(a.rarity)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{text.description}</p>
                {a.unlocked ? (
                    <p className="text-xs text-success">{t("card.unlockedOn", { date: formatDate(a.unlocked_at) })}</p>
                ) : (
                    a.target > 1 && (
                        <div className="flex items-center gap-2 pt-1">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-strong" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                                <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-muted-foreground">
                                {t("card.progress", { progress: a.progress, target: a.target })}
                            </span>
                        </div>
                    )
                )}
            </div>
        </li>
    );
};
