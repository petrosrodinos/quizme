import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getLevelTitleLabel } from "@/config/constants/dropdowns/gamification/level-title.options";
import { useGamificationProfile } from "@/features/gamification/hooks/use-gamification";
import { LevelBadge } from "@/components/ui/level-badge";
import { XpProgressBar } from "@/components/ui/xp-progress-bar";
import { StreakFlame } from "@/components/ui/streak-flame";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { celebrateAt } from "@/lib/celebrate";
import { Routes } from "@/routes/routes";

/** Header progress chip (level + streak) that opens a popover with XP, streak and daily-goal details. */
export const GamificationStrip = () => {
    const { t } = useTranslation("layout");
    const { data, isPending, isError } = useGamificationProfile();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const prevMet = useRef<boolean | null>(null);

    useEffect(() => {
        if (!data) return;
        if (prevMet.current === false && data.daily_goal.met) celebrateAt(triggerRef.current);
        prevMet.current = data.daily_goal.met;
    }, [data]);

    if (isPending) return <Skeleton className="h-8 w-24" />;
    if (isError || !data) return null;

    const goal = data.daily_goal;
    const goalPct = goal.minutes > 0 ? Math.max((goal.progress_minutes / goal.minutes) * 100, goal.xp ? (goal.progress_xp / goal.xp) * 100 : 0) : 0;
    const goalValue = goal.met ? 100 : goalPct;
    const levelTitle = getLevelTitleLabel(data.level_title);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    ref={triggerRef}
                    type="button"
                    className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("strip.levelAria", { level: data.level, title: levelTitle })}
                >
                    <LevelBadge level={data.level} size="sm" />
                    <StreakFlame days={data.current_streak} size="sm" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-4 p-4">
                <Link to={Routes.achievements} className="flex items-center gap-3 rounded-lg hover:bg-accent">
                    <LevelBadge level={data.level} size="md" />
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 text-xs font-medium text-muted-foreground">{levelTitle}</div>
                        <XpProgressBar current={data.xp_into_level} target={data.xp_for_next_level} />
                    </div>
                </Link>

                <div className="flex items-start justify-between gap-3">
                    <div>
                        <StreakFlame days={data.current_streak} size="md" />
                        <p className="mt-1 text-xs text-muted-foreground">{t("strip.streakTooltip", { count: data.current_streak, best: data.longest_streak })}</p>
                    </div>
                    {data.streak_freezes > 0 && (
                        <span className="flex shrink-0 items-center gap-0.5 text-xs text-teal" aria-label={t("strip.freezes", { count: data.streak_freezes })}>
                            <Snowflake className="h-3.5 w-3.5" />
                            {data.streak_freezes}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <ProgressRing value={goalValue} size={40} strokeWidth={4} label={t("strip.goalLabel")} indicatorClassName={goal.met ? "stroke-success" : undefined}>
                        <span className="text-[10px] font-semibold">{Math.round(goalValue)}</span>
                    </ProgressRing>
                    <p className="text-xs text-muted-foreground">
                        {t("strip.goalTooltip", { minutes: Math.round(goal.progress_minutes), goalMinutes: goal.minutes, xp: goal.progress_xp, goalXp: goal.xp })}
                        {goal.met ? ` · ${t("strip.goalComplete")}` : ""}
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
};
