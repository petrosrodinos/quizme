import type { FC } from "react";
import { Link } from "react-router-dom";
import { BookOpenCheck, Brain, Clock, Layers, Percent, Sigma, TrendingUp } from "lucide-react";
import { Main } from "@/components/layout/main";
import { StatCard } from "@/components/ui/stat-card";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Button } from "@/components/ui/button";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { getReadinessConfidenceLabel } from "@/config/constants/dropdowns/analytics/review-rating.options";
import { useProjectProgress } from "@/features/analytics/hooks/use-analytics";
import type { TopicScore } from "@/features/analytics/interfaces/analytics.interfaces";
import { useProjectContext } from "../../hooks/use-project-context";
import { AttemptsTrendChart, ChartCard, DailyActivityChart, DifficultyChart, RatingsChart } from "./components/progress-charts";
import { LeaderboardCard } from "./components/leaderboard-card";
import { useTranslation } from "react-i18next";

const TopicList: FC<{ topics: TopicScore[]; tone: "success" | "warning"; empty: string; projectId: string }> = ({ topics, tone, empty, projectId }) =>
    topics.length ? (
        <ul className="space-y-2.5">
            {topics.map((topic) => (
                <li key={topic.id}>
                    <Link to={Routes.projects.topics(projectId)} className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="flex justify-between text-sm">
                            <span className="truncate">{topic.name}</span>
                            <span className="tabular-nums text-muted-foreground">{topic.mastery}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-strong">
                            <div className={tone === "success" ? "h-full rounded-full bg-success" : "h-full rounded-full bg-warning"} style={{ width: `${Math.max(3, topic.mastery)}%` }} />
                        </div>
                    </Link>
                </li>
            ))}
        </ul>
    ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
    );

const pct = (v: number | null) => (v === null ? "—" : v);
const pctSuffix = (v: number | null) => (v === null ? undefined : "%");

export default function ProjectProgressPage() {
    const { t } = useTranslation("progress");
    const { project, projectId } = useProjectContext();
    usePageMetadata({ title: t("metaTitle", { title: project.title }) });
    const { data, isPending, isError, error } = useProjectProgress(projectId);

    if (isPending)
        return (
            <Main>
                <DetailSkeleton />
            </Main>
        );
    if (isError || !data)
        return (
            <Main>
                <EmptyState title={t("loadError")} description={error?.message} />
            </Main>
        );

    const totals = data.totals;
    const noData = !totals.questions_answered && !totals.cards_reviewed && !totals.study_minutes;

    return (
        <Main>
            {noData && (
                <EmptyState
                    className="mb-6"
                    compact
                    title={t("empty.title")}
                    description={t("empty.description")}
                    action={
                        <Button asChild size="sm">
                            <Link to={Routes.projects.quizzes(projectId)}>{t("empty.action")}</Link>
                        </Button>
                    }
                />
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("stats.studyTime")} value={totals.study_minutes} suffix={t("stats.minSuffix")} icon={Clock} hint={t("stats.last60")} />
                <StatCard label={t("stats.questions")} value={totals.questions_answered} icon={BookOpenCheck} hint={t("stats.completedQuizzes", { count: totals.attempts })} />
                <StatCard label={t("stats.accuracy")} value={pct(totals.accuracy)} suffix={pctSuffix(totals.accuracy)} icon={Percent} />
                <StatCard label={t("stats.averageScore")} value={pct(totals.average_score)} suffix={pctSuffix(totals.average_score)} icon={Sigma} />
                <StatCard label={t("stats.retention")} value={pct(totals.retention)} suffix={pctSuffix(totals.retention)} icon={Layers} hint={t("stats.reviews", { count: totals.cards_reviewed })} />
                <StatCard
                    label={t("stats.improvement")}
                    value={totals.improvement_rate === null ? "—" : `${totals.improvement_rate > 0 ? "+" : ""}${totals.improvement_rate}`}
                    suffix={totals.improvement_rate === null ? undefined : t("stats.pts")}
                    icon={TrendingUp}
                    tone={totals.improvement_rate !== null && totals.improvement_rate > 0 ? "success" : "default"}
                    hint={t("stats.improvementHint")}
                />
                <StatCard label={t("stats.recall")} value={pct(totals.recall_average)} suffix={pctSuffix(totals.recall_average)} icon={Brain} hint={t("stats.recallHint")} />
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                    <ProgressRing value={data.readiness.score} size={72} strokeWidth={7} label={t("stats.readinessLabel")}>
                        <span className="font-display text-lg">{data.readiness.score}%</span>
                    </ProgressRing>
                    <div>
                        <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("stats.readiness")}</div>
                        <div className="text-xs text-muted-foreground">{getReadinessConfidenceLabel(data.readiness.confidence)}</div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <ChartCard title={t("charts.last30.title")} description={t("charts.last30.description")} className="lg:col-span-2">
                    <DailyActivityChart daily={data.daily} />
                </ChartCard>
                <ChartCard title={t("charts.attempts.title")}>
                    {data.attempts.length ? <AttemptsTrendChart attempts={data.attempts} /> : <p className="text-sm text-muted-foreground">{t("charts.attempts.empty")}</p>}
                </ChartCard>
                <ChartCard title={t("charts.difficulty.title")} description={t("charts.difficulty.description")}>
                    <DifficultyChart rows={data.by_difficulty} />
                </ChartCard>
                <ChartCard title={t("charts.ratings.title")} description={t("charts.ratings.description")}>
                    <RatingsChart rows={data.flashcards.by_rating} />
                </ChartCard>
                <ChartCard title={t("charts.readiness.title")}>
                    <ul className="space-y-2.5">
                        {data.readiness.factors.map((f) => (
                            <li key={f.key}>
                                <div className="flex justify-between text-sm">
                                    <span>{t(`overview:readiness.factors.${f.key}`, { defaultValue: f.label })}</span>
                                    <span className="tabular-nums text-muted-foreground">{f.value === null ? t("charts.readiness.noData") : `${f.value}%`}</span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-strong">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${f.value ?? 0}%` }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                    {data.readiness.blockers.length > 0 && (
                        <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
                            {data.readiness.blockers.map((b) => (
                                <li key={b}>• {b}</li>
                            ))}
                        </ul>
                    )}
                </ChartCard>
                <ChartCard title={t("charts.strong.title")}>
                    <TopicList topics={data.strong_topics} tone="success" empty={t("charts.strong.empty")} projectId={projectId} />
                </ChartCard>
                <ChartCard title={t("charts.weak.title")}>
                    <TopicList topics={data.weak_topics} tone="warning" empty={t("charts.weak.empty")} projectId={projectId} />
                </ChartCard>
                {(project.counts?.members ?? 1) > 1 && <LeaderboardCard projectId={projectId} />}
            </div>
        </Main>
    );
}
