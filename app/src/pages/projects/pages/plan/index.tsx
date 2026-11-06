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

export default function ProjectPlanPage() {
    const { project, projectId, can } = useProjectContext();
    usePageMetadata({ title: `${project.title} · Study plan` });
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
                <EmptyState title="Couldn't build your study plan" description={error?.message} action={<Button onClick={() => refetch()}>Try again</Button>} />
            </Main>
        );

    const gap = Math.max(0, plan.target_score - plan.readiness);

    return (
        <Main>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-display text-2xl">Your study plan</h2>
                    <p className="text-sm text-muted-foreground">Adapts to your progress — updated {formatDate(plan.generated_at, "MMM d, HH:mm")}.</p>
                </div>
                {can.edit && (
                    <Button variant="outline" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
                        <Pencil /> {editing ? "Close" : "Edit goals"}
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
                    label="Exam"
                    value={plan.days_remaining ?? "—"}
                    suffix={plan.days_remaining !== null ? (plan.days_remaining === 1 ? " day" : " days") : undefined}
                    hint={plan.exam_date ? formatDate(plan.exam_date) : "Set an exam date for a countdown"}
                    icon={CalendarDays}
                    tone={plan.days_remaining !== null && plan.days_remaining <= 7 ? "warning" : "default"}
                />
                <StatCard label="Recommended" value={plan.recommended.minutes_per_day} suffix=" min/day" icon={Clock} hint={`${plan.recommended.days_per_week} days per week`} />
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 sm:col-span-2">
                    <ProgressRing value={plan.readiness} size={80} strokeWidth={8} label="Readiness versus target" indicatorClassName={plan.readiness >= plan.target_score ? "stroke-success" : undefined}>
                        <span className="font-display text-xl">{plan.readiness}%</span>
                    </ProgressRing>
                    <div className="min-w-0">
                        <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Readiness vs target</div>
                        <div className="text-sm">
                            Target <span className="font-medium">{plan.target_score}%</span> · {gap > 0 ? `${gap} points to go` : "Target reached"}
                        </div>
                        <div className={cn("mt-1 inline-flex items-center gap-1 text-xs", plan.progress.on_track ? "text-success" : "text-warning")}>
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                            {plan.progress.on_track ? "On track" : "Behind plan"} · {plan.progress.actual_week_minutes}/{plan.progress.planned_week_minutes} min this week
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-5">
                <section className="rounded-xl border border-border bg-card p-5 lg:col-span-3" aria-labelledby="schedule-heading">
                    <h3 id="schedule-heading" className="mb-3 font-display text-lg">
                        Next {plan.schedule.length} days
                    </h3>
                    <ol className="divide-y divide-border">
                        {plan.schedule.map((d, i) => (
                            <li key={d.date} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
                                <div className="w-28 shrink-0">
                                    <div className="text-sm font-medium">{i === 0 ? "Today" : formatDate(d.date, "EEE, MMM d")}</div>
                                    <div className="text-xs text-muted-foreground">{d.rest ? "Rest day" : `${d.minutes} min`}</div>
                                </div>
                                {d.rest ? (
                                    <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Coffee className="h-4 w-4" aria-hidden /> Recharge — rest helps memory consolidate.
                                    </div>
                                ) : (
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        {d.focus_topic && <div className="text-sm">Focus: <span className="font-medium">{d.focus_topic.name}</span></div>}
                                        <div className="flex flex-wrap gap-1.5">
                                            {d.activities
                                                .filter((a) => a.minutes > 0)
                                                .map((a) => (
                                                    <span key={a.type} className="rounded-full bg-surface-card px-2.5 py-0.5 text-xs text-muted-foreground">
                                                        {getPlanActivityLabel(a.type)} · {a.minutes}m
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
                            Priority topics
                        </h3>
                        {plan.priority_topics.length ? (
                            <ol className="space-y-3">
                                {plan.priority_topics.map((t, i) => (
                                    <li key={t.id} className="flex items-center gap-3">
                                        <span className="w-5 text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-medium">{t.name}</div>
                                            <div className="text-xs text-muted-foreground">{t.attempts ? `${t.mastery}% mastery` : "Not practised yet"}</div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => practise(t.id)} loading={practising === t.id} disabled={!!practising && practising !== t.id} aria-label={`Practise ${t.name}`}>
                                            <Target /> Practise
                                        </Button>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-sm text-muted-foreground">Topics appear once your documents are processed.</p>
                        )}
                    </section>
                    <section className="rounded-xl border border-border bg-card p-5" aria-labelledby="advice-heading">
                        <h3 id="advice-heading" className="mb-3 inline-flex items-center gap-2 font-display text-lg">
                            <Lightbulb className="h-4 w-4 text-amber" aria-hidden /> Advice
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
