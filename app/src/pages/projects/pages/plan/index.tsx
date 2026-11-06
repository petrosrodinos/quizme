import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock, Coffee, Lightbulb, Pencil, Target } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatCard } from "@/components/ui/stat-card";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/routes";
import { getPlanActivityLabel } from "@/config/constants/dropdowns/analytics/plan-activity.options";
import { useStudyPlan } from "@/features/analytics/hooks/use-analytics";
import { useStartSessionQuiz } from "@/features/study/hooks/use-study";
import { QuizModes } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { useProjectContext } from "../../hooks/use-project-context";
import { PlanSettingsForm } from "./components/plan-settings-form";
import { useTranslation } from "react-i18next";

export default function ProjectPlanPage() {
    const { t } = useTranslation("plan");
    const { project, projectId, can } = useProjectContext();
    usePageMetadata({ title: t("metaTitle", { title: project.title }) });
    const navigate = useNavigate();
    const { data: plan, isPending, isError, error, refetch } = useStudyPlan(projectId);
    const startQuiz = useStartSessionQuiz();
    const [editing, setEditing] = useState(false);
    const [practising, setPractising] = useState<string | null>(null);

    const practise = (topicId: string) => {
        setPractising(topicId);
        startQuiz.mutate(
            { projectId, dto: { mode: QuizModes.PRACTICE, count: 8, topic_ids: [topicId], difficulty: "adaptive" } },
            { onSuccess: (quiz) => navigate(Routes.projects.quiz_take(projectId, quiz.id)), onSettled: () => setPractising(null) },
        );
    };

    if (isPending)
        return (
            <Main>
                <DetailSkeleton />
            </Main>
        );
    if (isError || !plan)
        return (
            <Main>
                <EmptyState title={t("error.title")} description={error?.message} action={<Button onClick={() => refetch()}>{t("common:actions.tryAgain")}</Button>} />
            </Main>
        );

    const gap = Math.max(0, plan.target_score - plan.readiness);

    return (
        <Main>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-display text-2xl">{t("title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("updated", { date: formatDate(plan.generated_at, "d MMM, HH:mm") })}</p>
                </div>
                {can.edit && (
                    <Button variant="outline" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
                        <Pencil /> {editing ? t("close") : t("editGoals")}
                    </Button>
                )}
            </div>

            {editing && (
                <section className="mb-6 rounded-xl border border-border bg-card p-5">
                    <PlanSettingsForm
                        project={project}
                        defaults={{ minutes: plan.recommended.minutes_per_day, days: plan.recommended.days_per_week }}
                        onSaved={() => {
                            setEditing(false);
                            refetch();
                        }}
                    />
                </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label={t("stats.exam")}
                    value={plan.days_remaining ?? "—"}
                    suffix={plan.days_remaining !== null ? t("stats.daySuffix", { count: plan.days_remaining }) : undefined}
                    hint={plan.exam_date ? formatDate(plan.exam_date) : t("stats.noExam")}
                    icon={CalendarDays}
                    tone={plan.days_remaining !== null && plan.days_remaining <= 7 ? "warning" : "default"}
                />
                <StatCard label={t("stats.recommended")} value={plan.recommended.minutes_per_day} suffix={t("stats.minPerDay")} icon={Clock} hint={t("stats.daysPerWeek", { count: plan.recommended.days_per_week })} />
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 sm:col-span-2">
                    <ProgressRing value={plan.readiness} size={80} strokeWidth={8} label={t("readiness.label")} indicatorClassName={plan.readiness >= plan.target_score ? "stroke-success" : undefined}>
                        <span className="font-display text-xl">{plan.readiness}%</span>
                    </ProgressRing>
                    <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("readiness.title")}</div>
                        <div className="text-sm">
                            {t("readiness.target")} <span className="font-medium">{plan.target_score}%</span> · {gap > 0 ? t("readiness.pointsToGo", { count: gap }) : t("readiness.reached")}
                        </div>
                        <div className={cn("mt-1 inline-flex items-center gap-1 text-xs", plan.progress.on_track ? "text-success" : "text-warning")}>
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            {plan.progress.on_track ? t("readiness.onTrack") : t("readiness.behind")} · {t("readiness.weekMinutes", { actual: plan.progress.actual_week_minutes, planned: plan.progress.planned_week_minutes })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-5">
                <section className="rounded-xl border border-border bg-card p-5 lg:col-span-3" aria-labelledby="schedule-heading">
                    <h3 id="schedule-heading" className="mb-3 font-display text-lg">
                        {t("schedule.title", { count: plan.schedule.length })}
                    </h3>
                    <ol className="divide-y divide-border">
                        {plan.schedule.map((d, i) => (
                            <li key={d.date} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
                                <div className="w-28 shrink-0">
                                    <div className="text-sm font-medium">{i === 0 ? t("schedule.today") : formatDate(d.date, "EEE d MMM")}</div>
                                    <div className="text-xs text-muted-foreground">{d.rest ? t("schedule.restDay") : t("schedule.minutes", { count: d.minutes })}</div>
                                </div>
                                {d.rest ? (
                                    <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Coffee className="h-4 w-4" aria-hidden /> {t("schedule.rest")}
                                    </div>
                                ) : (
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        {d.focus_topic && <div className="text-sm">{t("schedule.focus")} <span className="font-medium">{d.focus_topic.name}</span></div>}
                                        <div className="flex flex-wrap gap-1.5">
                                            {d.activities
                                                .filter((a) => a.minutes > 0)
                                                .map((a) => (
                                                    <span key={a.type} className="rounded-full bg-surface-card px-2.5 py-0.5 text-xs text-muted-foreground">
                                                        {t("schedule.activity", { label: getPlanActivityLabel(a.type), minutes: a.minutes })}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ol>
                </section>

                <div className="space-y-4 lg:col-span-2">
                    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="priority-heading">
                        <h3 id="priority-heading" className="mb-3 font-display text-lg">
                            {t("priority.title")}
                        </h3>
                        {plan.priority_topics.length ? (
                            <ol className="space-y-3">
                                {plan.priority_topics.map((topic, i) => (
                                    <li key={topic.id} className="flex items-center gap-3">
                                        <span className="w-5 text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium">{topic.name}</div>
                                            <div className="text-xs text-muted-foreground">{topic.attempts ? t("priority.mastery", { value: topic.mastery }) : t("priority.notPractised")}</div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => practise(topic.id)} loading={practising === topic.id} disabled={!!practising && practising !== topic.id} aria-label={t("priority.practiseLabel", { name: topic.name })}>
                                            <Target /> {t("priority.practise")}
                                        </Button>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-sm text-muted-foreground">{t("priority.empty")}</p>
                        )}
                    </section>
                    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="advice-heading">
                        <h3 id="advice-heading" className="mb-3 inline-flex items-center gap-2 font-display text-lg">
                            <Lightbulb className="h-4 w-4 text-amber" aria-hidden /> {t("advice.title")}
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {plan.advice.map((a) => (
                                <li key={a}>• {a}</li>
                            ))}
                        </ul>
                    </section>
                </div>
            </div>
        </Main>
    );
}
