import { useMemo } from "react";
import { Snowflake } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { DetailSkeleton, GridSkeleton } from "@/components/ui/card-skeletons";
import { LevelBadge } from "@/components/ui/level-badge";
import { StreakFlame } from "@/components/ui/streak-flame";
import { XpProgressBar } from "@/components/ui/xp-progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LevelTitleOptions } from "@/config/constants/dropdowns/gamification/level-title.options";
import { useAchievements, useActivity, useGamificationProfile } from "@/features/gamification/hooks/use-gamification";
import { AchievementCard } from "./components/achievement-card";
import { ActivityHeatmap } from "./components/activity-heatmap";
import { DailyGoalPicker } from "./components/daily-goal-picker";

export default function AchievementsPage() {
    usePageMetadata({ title: "Achievements" });
    const profile = useGamificationProfile();
    const achievements = useAchievements();
    const activity = useActivity(84);

    const grouped = useMemo(() => {
        const map = new Map<string, NonNullable<typeof achievements.data>>();
        for (const a of achievements.data ?? []) map.set(a.category, [...(map.get(a.category) ?? []), a]);
        return [...map.entries()];
    }, [achievements.data]);
    const unlocked = (achievements.data ?? []).filter((a) => a.unlocked).length;
    const p = profile.data;

    return (
        <Main>
            <PageHeader eyebrow="Progress" title="Achievements & streaks" description="Rewards for real learning — consistency, accuracy and mastery." />
            {profile.isPending ? (
                <DetailSkeleton />
            ) : p ? (
                <div className="grid gap-4 lg:grid-cols-3">
                    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="level-heading">
                        <h2 id="level-heading" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            Level
                        </h2>
                        <div className="mt-3 flex items-center justify-between">
                            <LevelBadge level={p.level} title={p.level_title} size="lg" />
                            <span className="text-sm text-muted-foreground">{formatNumber(p.total_xp)} XP</span>
                        </div>
                        <XpProgressBar className="mt-4" current={p.xp_into_level} target={p.xp_for_next_level} />
                        <ol className="mt-5 flex flex-wrap gap-1.5" aria-label="Level titles">
                            {LevelTitleOptions.map((t) => (
                                <li
                                    key={t.id}
                                    className={cn(
                                        "rounded-full px-2.5 py-1 text-xs",
                                        p.level >= t.from_level ? "bg-primary/12 font-medium text-primary" : "bg-surface-card text-muted-foreground",
                                    )}
                                >
                                    {t.label} <span className="opacity-60">· {t.from_level}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                    <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2" aria-labelledby="streak-heading">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 id="streak-heading" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    Study streak
                                </h2>
                                <div className="mt-2 flex items-center gap-3">
                                    <StreakFlame days={p.current_streak} size="lg" showLabel />
                                    <span className="text-sm text-muted-foreground">longest {p.longest_streak}</span>
                                </div>
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1.5 text-xs text-muted-foreground" title="Earn one freeze per 7-day streak (max 2). Freezes protect a missed day automatically.">
                                <Snowflake className="h-3.5 w-3.5 text-teal" aria-hidden /> {p.streak_freezes} / 2 freezes
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Your streak grows when you complete your daily goal — not just by opening the app.</p>
                        <div className="mt-4">{activity.data ? <ActivityHeatmap days={activity.data} /> : <div className="h-28 animate-pulse rounded-lg bg-muted" />}</div>
                    </section>
                    <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-3" aria-labelledby="goal-heading">
                        <h2 id="goal-heading" className="mb-3 font-display text-lg">
                            Daily goal
                        </h2>
                        <DailyGoalPicker goal={p.daily_goal} />
                    </section>
                </div>
            ) : null}

            <div className="mt-10 mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-2xl">Achievements</h2>
                {achievements.data && (
                    <span className="text-sm text-muted-foreground">
                        {unlocked} of {achievements.data.length} unlocked
                    </span>
                )}
            </div>
            {achievements.isPending ? (
                <GridSkeleton count={6} />
            ) : !grouped.length ? (
                <EmptyState title="No achievements yet" description="Start studying to unlock your first achievement." />
            ) : (
                <div className="space-y-8">
                    {grouped.map(([category, list]) => (
                        <section key={category} aria-labelledby={`cat-${category}`}>
                            <h3 id={`cat-${category}`} className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                {category}
                            </h3>
                            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {list.map((a) => (
                                    <AchievementCard key={a.key} achievement={a} />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </Main>
    );
}
