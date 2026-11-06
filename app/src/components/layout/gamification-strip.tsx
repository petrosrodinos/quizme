import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Snowflake } from "lucide-react";
import { useGamificationProfile } from "@/features/gamification/hooks/use-gamification";
import { LevelBadge } from "@/components/ui/level-badge";
import { XpProgressBar } from "@/components/ui/xp-progress-bar";
import { StreakFlame } from "@/components/ui/streak-flame";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { celebrateAt } from "@/lib/celebrate";
import { Routes } from "@/routes/routes";

/** Header strip: level + XP bar, streak flame, daily-goal ring. Hidden gracefully when unavailable. */
export const GamificationStrip = () => {
    const { data, isPending, isError } = useGamificationProfile();
    const ringRef = useRef<HTMLDivElement>(null);
    const prevMet = useRef<boolean | null>(null);

    useEffect(() => {
        if (!data) return;
        if (prevMet.current === false && data.daily_goal.met) celebrateAt(ringRef.current);
        prevMet.current = data.daily_goal.met;
    }, [data]);

    if (isPending) {
        return (
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        );
    }
    if (isError || !data) return null;

    const goal = data.daily_goal;
    const goalPct = goal.minutes > 0 ? Math.max((goal.progress_minutes / goal.minutes) * 100, goal.xp ? (goal.progress_xp / goal.xp) * 100 : 0) : 0;

    return (
        <div className="flex items-center gap-3 sm:gap-5">
            <Link to={Routes.achievements} className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 hover:bg-accent" aria-label={`Level ${data.level} ${data.level_title}`}>
                <LevelBadge level={data.level} size="sm" />
                <div className="hidden w-32 md:block">
                    <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">{data.level_title}</div>
                    <XpProgressBar current={data.xp_into_level} target={data.xp_for_next_level} showLabel={false} />
                </div>
            </Link>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                        <StreakFlame days={data.current_streak} size="sm" />
                        {data.streak_freezes > 0 && (
                            <span className="flex items-center text-[11px] text-teal" aria-label={`${data.streak_freezes} streak freezes`}>
                                <Snowflake className="h-3 w-3" />
                                {data.streak_freezes}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    {data.current_streak}-day streak · best {data.longest_streak}
                    {data.streak_freezes ? ` · ${data.streak_freezes} freeze(s)` : ""}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div ref={ringRef}>
                        <ProgressRing
                            value={goal.met ? 100 : goalPct}
                            size={32}
                            strokeWidth={4}
                            label="Daily goal progress"
                            indicatorClassName={goal.met ? "stroke-success" : undefined}
                        >
                            <span className="text-[9px] font-semibold">{Math.round(goal.met ? 100 : goalPct)}</span>
                        </ProgressRing>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    Daily goal: {Math.round(goal.progress_minutes)}/{goal.minutes} min · {goal.progress_xp}/{goal.xp} XP{goal.met ? " · complete!" : ""}
                </TooltipContent>
            </Tooltip>
        </div>
    );
};
