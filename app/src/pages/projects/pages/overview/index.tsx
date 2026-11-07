import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Brain, CalendarDays, Clock, FileText, Layers, MessageCircle, Sparkles, Upload } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { Routes } from "@/routes/routes";
import { daysUntil, formatDate } from "@/lib/date";
import { useProjectOverview } from "@/features/projects/hooks/use-projects";
import { useCreateQuickQuiz } from "@/features/quiz-generation/hooks/use-quiz-generation";
import { QuickQuizModes } from "@/features/quiz-generation/services/quiz-generation.services";
import { useProjectContext } from "../../hooks/use-project-context";
import { ReadinessCard } from "./components/readiness-card";
import { RecentAttemptsChart } from "./components/recent-attempts-chart";
import { useTranslation } from "react-i18next";

/** Recommendation links from the API are in-app paths; only follow internal ones. */
const internalLink = (link?: string | null) => (link && link.startsWith("/") && !link.startsWith("//") ? link : null);

export default function ProjectOverviewPage() {
    const { t } = useTranslation("overview");
    const { project, projectId, can } = useProjectContext();
    usePageMetadata({ title: t("metaTitle", { title: project.title }) });
    const navigate = useNavigate();
    const { data, isPending, isError } = useProjectOverview(projectId);
    const adaptive = useCreateQuickQuiz();

    const startAdaptive = () =>
        adaptive.mutate({ projectId, dto: { mode: QuickQuizModes.ADAPTIVE, count: 10 } }, { onSuccess: () => navigate(Routes.projects.quizzes(projectId)) });

    if (isPending)
        return (
            <Main>
                <DetailSkeleton />
            </Main>
        );

    const docs = data?.documents;
    const examDays = data?.exam?.days_remaining ?? daysUntil(project.exam_date);
    const noDocs = !isError && docs && docs.total === 0;

    return (
        <Main>
            {noDocs && (
                <div className="mb-6">
                    <EmptyState
                        icon={Upload}
                        title={t("empty.title")}
                        description={t("empty.description")}
                        action={
                            can.contribute ? (
                                <Button asChild>
                                    <Link to={Routes.projects.documents(projectId)}>
                                        <Upload /> {t("empty.action")}
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("stats.cardsDue")} value={data?.cards_due ?? 0} icon={Layers} tone={(data?.cards_due ?? 0) > 0 ? "primary" : "default"} />
                <StatCard label={t("stats.quizAccuracy")} value={data?.quiz_accuracy != null ? Math.round(data.quiz_accuracy) : "—"} suffix={data?.quiz_accuracy != null ? "%" : undefined} icon={BookOpenCheck} />
                <StatCard label={t("stats.studyTime")} value={data?.study_time_week_min ?? 0} suffix={t("stats.minSuffix")} icon={Clock} />
                <StatCard
                    label={t("stats.exam")}
                    value={examDays != null && examDays >= 0 ? examDays : "—"}
                    suffix={examDays != null && examDays >= 0 ? t("stats.daySuffix", { count: examDays }) : undefined}
                    hint={project.exam_date ? formatDate(project.exam_date) : t("stats.noExamDate")}
                    icon={CalendarDays}
                    tone={examDays != null && examDays >= 0 && examDays <= 7 ? "warning" : "default"}
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-3">
                    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="today-heading">
                        <div className="mb-4 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                            <h2 id="today-heading" className="font-display text-xl">
                                {data?.recommendation?.title || t("session.title")}
                            </h2>
                        </div>
                        {data?.recommendation?.items?.length ? (
                            <ul className="divide-y divide-border">
                                {data.recommendation.items.map((item, i) => {
                                    const link = internalLink(item.link);
                                    return (
                                        <li key={`${item.type}-${i}`} className="flex items-center justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium">{item.label || t(`session.blocks.${item.type}`)}</div>
                                                <div className="text-xs text-muted-foreground">{t("session.minutes", { count: item.minutes })}</div>
                                            </div>
                                            {link && (
                                                <Button asChild variant="ghost" size="sm">
                                                    <Link to={link}>
                                                        {t("session.start")} <ArrowRight />
                                                    </Link>
                                                </Button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {isError ? t("session.unavailable") : t("session.pending")}
                            </p>
                        )}
                    </section>

                    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="actions-heading">
                        <h2 id="actions-heading" className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            {t("actions.title")}
                        </h2>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {can.contribute && (
                                <Button asChild variant="outline" className="justify-start">
                                    <Link to={Routes.projects.documents(projectId)}>
                                        <Upload /> {t("actions.upload")}
                                    </Link>
                                </Button>
                            )}
                            <Button variant="outline" className="justify-start" onClick={startAdaptive} loading={adaptive.isPending}>
                                <Brain /> {t("actions.adaptive")}
                            </Button>
                            <Button asChild variant="outline" className="justify-start">
                                <Link to={Routes.projects.flashcards_review(projectId)}>
                                    <Layers /> {t("actions.review")}
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="justify-start">
                                <Link to={Routes.projects.tutor(projectId)}>
                                    <MessageCircle /> {t("actions.tutor")}
                                </Link>
                            </Button>
                        </div>
                    </section>

                    {!!data?.recent_attempts?.length && (
                        <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="attempts-heading">
                            <div className="mb-2 flex items-center justify-between">
                                <h2 id="attempts-heading" className="font-display text-xl">
                                    {t("attempts.title")}
                                </h2>
                                <Button asChild variant="link" size="sm" className="px-0">
                                    <Link to={Routes.projects.progress(projectId)}>{t("attempts.allProgress")}</Link>
                                </Button>
                            </div>
                            <RecentAttemptsChart attempts={data.recent_attempts} />
                        </section>
                    )}
                </div>

                <div className="space-y-6 lg:col-span-2">
                    <ReadinessCard readiness={data?.readiness} targetScore={project.target_score} />

                    {docs && docs.total > 0 && (
                        <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="docs-heading">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 id="docs-heading" className="flex items-center gap-2 text-sm font-medium">
                                    <FileText className="h-4 w-4 text-muted-foreground" /> {t("docs.title")}
                                </h2>
                                <Link to={Routes.projects.documents(projectId)} className="text-xs text-primary hover:underline">
                                    {t("docs.manage")}
                                </Link>
                            </div>
                            <Progress value={(docs.ready / Math.max(1, docs.total)) * 100} aria-label={t("docs.readyLabel")} />
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>{t("docs.ready", { count: docs.ready })}</span>
                                {docs.processing > 0 && <span className="text-primary">{t("docs.processing", { count: docs.processing })}</span>}
                                {docs.failed > 0 && <span className="text-destructive">{t("docs.failed", { count: docs.failed })}</span>}
                                <span>{t("common:count.document", { count: docs.total })}</span>
                            </div>
                        </section>
                    )}

                    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="weak-heading">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 id="weak-heading" className="text-sm font-medium">
                                {t("weak.title")}
                            </h2>
                            <Link to={Routes.projects.topics(projectId)} className="text-xs text-primary hover:underline">
                                {t("weak.map")}
                            </Link>
                        </div>
                        {data?.weak_topics?.length ? (
                            <ul className="space-y-2.5">
                                {data.weak_topics.map((topic) => (
                                    <li key={topic.id}>
                                        <div className="mb-1 flex justify-between text-xs">
                                            <span className="truncate pr-2">{topic.name}</span>
                                            <span className="tabular-nums text-muted-foreground">{Math.round(topic.mastery)}%</span>
                                        </div>
                                        <Progress value={topic.mastery} aria-label={t("weak.masteryLabel", { name: topic.name })} className="h-1.5" />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">{t("weak.none")}</p>
                        )}
                    </section>
                </div>
            </div>
        </Main>
    );
}
