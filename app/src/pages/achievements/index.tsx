import { useMemo } from "react";
import { Snowflake } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { getLevelTitleLabel, LevelTitleOptions } from "@/config/constants/dropdowns/gamification/level-title.options";
import { getAchievementCategoryLabel } from "@/config/constants/dropdowns/gamification/achievement-text.options";
import { useAchievements, useActivity, useGamificationProfile } from "@/features/gamification/hooks/use-gamification";
import { AchievementCard } from "./components/achievement-card";
import { ActivityHeatmap } from "./components/activity-heatmap";
import { DailyGoalPicker } from "./components/daily-goal-picker";

export default function AchievementsPage() {
    const { t } = useTranslation("achievements");
    usePageMetadata({ title: t("pageTitle") });
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
            <PageHeader eyebrow={t("header.eyebrow")} title={t("header.title")} description={t("header.description")} />
            {profile.isPending ? (
                <DetailSkeleton />
            ) : p ? (
                <div className="grid gap-4 lg:grid-cols-3">
                    <section className="rounded-2xl border border-border bg-card p-5" aria-labelledby="level-heading">
                        <h2 id="level-heading" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {t("common:terms.level")}
                        </h2>
                        <div className="mt-3 flex items-center justify-between">
                            <LevelBadge level={p.level} title={getLevelTitleLabel(p.level_title)} size="lg" />
                            <span className="text-sm text-muted-foreground">{t("totalXp", { xp: formatNumber(p.total_xp) })}</span>
                        </div>
                        <XpProgressBar className="mt-4" current={p.xp_into_level} target={p.xp_for_next_level} />
                        <ol className="mt-5 flex flex-wrap gap-1.5" aria-label={t("levelTitles")}>
                            {LevelTitleOptions.map((lt) => (
                                <li
                                    key={lt.id}
                                    className={cn(
                                        "rounded-full px-2.5 py-1 text-xs",
                                        p.level >= lt.from_level ? "bg-primary/12 font-medium text-primary" : "bg-surface-card text-muted-foreground",
                                    )}
                                >
                                    {lt.label} <span className="opacity-60">· {lt.from_level}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                    <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2" aria-labelledby="streak-heading">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 id="streak-heading" className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                    {t("streak.title")}
                                </h2>
                                <div className="mt-2 flex items-center gap-3">
                                    <StreakFlame days={p.current_streak} size="lg" showLabel />
                                    <span className="text-sm text-muted-foreground">{t("streak.longest", { count: p.longest_streak })}</span>
                                </div>
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1.5 text-xs text-muted-foreground" title={t("streak.freezeHelp")}>
                                <Snowflake className="h-3.5 w-3.5 text-teal" aria-hidden /> {t("streak.freezes", { count: p.streak_freezes, max: 2 })}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{t("streak.explainer")}</p>
                        <div className="mt-4">{activity.data ? <ActivityHeatmap days={activity.data} /> : <div className="h-28 animate-pulse rounded-lg bg-muted" />}</div>
                    </section>
                    <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-3" aria-labelledby="goal-heading">
                        <h2 id="goal-heading" className="mb-3 font-display text-lg">
                            {t("common:terms.dailyGoal")}
                        </h2>
                        <DailyGoalPicker goal={p.daily_goal} />
                    </section>
                </div>
            ) : null}

            <div className="mt-10 mb-4 flex items-baseline justify-between">
                <h2 className="font-display text-2xl">{t("common:terms.achievements")}</h2>
                {achievements.data && (
                    <span className="text-sm text-muted-foreground">
                        {t("unlockedCount", { count: unlocked, total: achievements.data.length })}
                    </span>
                )}
            </div>
            {achievements.isPending ? (
                <GridSkeleton count={6} />
            ) : !grouped.length ? (
                <EmptyState title={t("empty.title")} description={t("empty.description")} />
            ) : (
                <div className="space-y-8">
                    {grouped.map(([category, list]) => (
                        <section key={category} aria-labelledby={`cat-${category}`}>
                            <h3 id={`cat-${category}`} className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                {getAchievementCategoryLabel(category)}
                            </h3>
                            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
