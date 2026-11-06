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

const TopicList: FC<{ topics: TopicScore[]; tone: "success" | "warning"; empty: string; projectId: string }> = ({ topics, tone, empty, projectId }) =>
    topics.length ? (
        <ul className="space-y-2.5">
            {topics.map((t) => (
                <li key={t.id}>
                    <Link to={Routes.projects.topics(projectId)} className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="flex justify-between text-sm">
                            <span className="truncate">{t.name}</span>
                            <span className="tabular-nums text-muted-foreground">{t.mastery}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-strong">
                            <div className={tone === "success" ? "h-full rounded-full bg-success" : "h-full rounded-full bg-warning"} style={{ width: `${Math.max(3, t.mastery)}%` }} />
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
    const { project, projectId } = useProjectContext();
    usePageMetadata({ title: `${project.title} · Progress` });
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
                <EmptyState title="Couldn't load progress" description={error?.message} />
            </Main>
        );

    const t = data.totals;
    const noData = !t.questions_answered && !t.cards_reviewed && !t.study_minutes;

    return (
        <Main>
            {noData && (
                <EmptyState
                    className="mb-6"
                    compact
                    title="Your learning analytics will appear here"
                    description="Take quizzes, review flashcards and explain concepts to build up your progress history."
                    action={
                        <Button asChild size="sm">
                            <Link to={Routes.projects.quizzes(projectId)}>Start a quiz</Link>
                        </Button>
                    }
                />
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Study time" value={t.study_minutes} suffix=" min" icon={Clock} hint="Last 60 days" />
                <StatCard label="Questions answered" value={t.questions_answered} icon={BookOpenCheck} hint={`${t.attempts} completed quizzes`} />
                <StatCard label="Accuracy" value={pct(t.accuracy)} suffix={pctSuffix(t.accuracy)} icon={Percent} />
                <StatCard label="Average score" value={pct(t.average_score)} suffix={pctSuffix(t.average_score)} icon={Sigma} />
                <StatCard label="Flashcard retention" value={pct(t.retention)} suffix={pctSuffix(t.retention)} icon={Layers} hint={`${t.cards_reviewed} reviews`} />
                <StatCard
                    label="Improvement"
                    value={t.improvement_rate === null ? "—" : `${t.improvement_rate > 0 ? "+" : ""}${t.improvement_rate}`}
                    suffix={t.improvement_rate === null ? undefined : " pts"}
                    icon={TrendingUp}
                    tone={t.improvement_rate !== null && t.improvement_rate > 0 ? "success" : "default"}
                    hint="First vs latest 5 quizzes"
                />
                <StatCard label="Recall score" value={pct(t.recall_average)} suffix={pctSuffix(t.recall_average)} icon={Brain} hint="Active recall & teach-back" />
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                    <ProgressRing value={data.readiness.score} size={72} strokeWidth={7} label="Exam readiness">
                        <span className="font-display text-lg">{data.readiness.score}%</span>
                    </ProgressRing>
                    <div>
                        <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Readiness</div>
                        <div className="text-xs text-muted-foreground">{getReadinessConfidenceLabel(data.readiness.confidence)}</div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <ChartCard title="Last 30 days" description="Minutes studied (bars) and answer accuracy (line)" className="lg:col-span-2">
                    <DailyActivityChart daily={data.daily} />
                </ChartCard>
                <ChartCard title="Quiz attempts over time">
                    {data.attempts.length ? <AttemptsTrendChart attempts={data.attempts} /> : <p className="text-sm text-muted-foreground">No completed quizzes yet.</p>}
                </ChartCard>
                <ChartCard title="Accuracy by difficulty" description="Are harder questions holding you back?">
                    <DifficultyChart rows={data.by_difficulty} />
                </ChartCard>
                <ChartCard title="Flashcard ratings" description="Last 60 days">
                    <RatingsChart rows={data.flashcards.by_rating} />
                </ChartCard>
                <ChartCard title="Readiness breakdown">
                    <ul className="space-y-2.5">
                        {data.readiness.factors.map((f) => (
                            <li key={f.key}>
                                <div className="flex justify-between text-sm">
                                    <span>{f.label}</span>
                                    <span className="tabular-nums text-muted-foreground">{f.value === null ? "no data" : `${f.value}%`}</span>
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
                <ChartCard title="Strongest topics">
                    <TopicList topics={data.strong_topics} tone="success" empty="Practise topics to see your strengths." projectId={projectId} />
                </ChartCard>
                <ChartCard title="Weakest topics">
                    <TopicList topics={data.weak_topics} tone="warning" empty="No weak topics detected yet." projectId={projectId} />
                </ChartCard>
                {(project.counts?.members ?? 1) > 1 && <LeaderboardCard projectId={projectId} />}
            </div>
        </Main>
    );
}
