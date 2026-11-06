import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Play } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { formatDateTime, formatDuration } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/routes";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { useAttemptHistory, useCreateQuiz, useQuizzes } from "@/features/quizzes/hooks/use-quizzes";
import { useFlatTopics } from "@/features/topics/hooks/use-topics";
import { QuizModes } from "@/features/quizzes/interfaces/quizzes.interfaces";
import type { QuestionType } from "@/features/questions/interfaces/questions.interfaces";
import { ScoreHistoryChart } from "@/pages/projects/components/quiz/score-history-chart";
import { getGenerationStatusLabel } from "@/config/constants/dropdowns/quizzes/generation-status.options";
import { ExamConfigForm } from "./components/exam-config-form";
import type { ExamFormValues } from "./validation-schemas/exam.schema";

export default function ProjectExamPage() {
    usePageMetadata({ title: "Exam simulation" });
    const { project, projectId } = useProjectContext();
    const navigate = useNavigate();
    const { flat: topics } = useFlatTopics(projectId);
    const create = useCreateQuiz(projectId, { silent: true });
    const history = useAttemptHistory(projectId, { mode: QuizModes.EXAM, limit: 50 });
    const quizzes = useQuizzes(projectId);
    const pendingExams = (quizzes.data ?? []).filter((q) => q.mode === QuizModes.EXAM && (!q.attempt_count || q.in_progress_attempt_id) && q.status !== "FAILED");

    const start = (v: ExamFormValues) =>
        create.mutate(
            {
                mode: QuizModes.EXAM,
                title: v.title?.trim() || undefined,
                count: v.count,
                time_limit_min: v.time_limit_min,
                target_score: v.target_score,
                difficulty: v.difficulty,
                types: v.types as QuestionType[],
                topic_ids: v.topic_ids.length ? v.topic_ids : undefined,
                randomize: v.randomize,
                use_bank: v.use_bank,
            },
            { onSuccess: (quiz) => navigate(Routes.projects.quiz_take(projectId, quiz.id)) },
        );

    const rows = history.data ?? [];
    const chronological = [...rows].reverse();
    const target = project.target_score;

    return (
        <Main width="wide">
            <PageHeader
                eyebrow="Exam coach"
                title="Exam simulation"
                description="Practise under realistic conditions: timed, no hints, results only at the end. Compare every simulation against your target."
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-6">
                    <ExamConfigForm topics={topics} defaultTarget={target ?? 80} pending={create.isPending} onSubmit={start} />
                    {!!pendingExams.length && (
                        <div className="rounded-xl border border-border bg-card p-4">
                            <div className="mb-2 text-sm font-medium">Ready or in progress</div>
                            <ul className="space-y-2">
                                {pendingExams.map((q) => (
                                    <li key={q.id} className="flex items-center gap-3 text-sm">
                                        <span className="min-w-0 flex-1 truncate">{q.title}</span>
                                        {q.status !== "READY" ? (
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <Loader2 className="h-3 w-3 animate-spin" /> {getGenerationStatusLabel(q.status)}
                                            </span>
                                        ) : (
                                            <Button size="sm" variant="outline" asChild>
                                                <Link to={Routes.projects.quiz_take(projectId, q.id)}>
                                                    <Play /> {q.in_progress_attempt_id ? "Resume" : "Start"}
                                                </Link>
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="rounded-2xl border border-border bg-card p-5">
                        <div className="mb-2 text-sm font-medium">Simulation results vs target</div>
                        {history.isPending ? (
                            <ListSkeleton rows={2} />
                        ) : chronological.length ? (
                            <ScoreHistoryChart points={chronological.map((a, i) => ({ label: `Sim ${i + 1}`, percentage: a.percentage }))} target={target} height={240} />
                        ) : (
                            <EmptyState icon={GraduationCap} title="No simulations yet" description="Your first simulation sets the baseline for your exam readiness." compact />
                        )}
                    </div>
                    {!!rows.length && (
                        <ul className="space-y-2">
                            {rows.map((a, i) => {
                                const prev = rows[i + 1];
                                const delta = prev ? a.percentage - prev.percentage : null;
                                const passed = target ? a.percentage >= target : null;
                                return (
                                    <li key={a.id}>
                                        <Link to={Routes.projects.attempt(projectId, a.id)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm transition-colors hover:border-primary/50">
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium">{a.quiz.title}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDateTime(a.completed_at)} · {a.correct_count}/{a.correct_count + a.incorrect_count} · {formatDuration(a.time_spent_sec)}
                                                </div>
                                            </div>
                                            {delta !== null && (
                                                <span className={cn("text-xs font-medium tabular-nums", delta >= 0 ? "text-success" : "text-destructive")}>
                                                    {delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(delta))}
                                                </span>
                                            )}
                                            <span className={cn("w-12 text-right font-display text-xl", passed === null ? "" : passed ? "text-success" : "text-destructive")}>{Math.round(a.percentage)}%</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </Main>
    );
}
