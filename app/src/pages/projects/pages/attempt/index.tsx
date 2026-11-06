import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, Flame, Lightbulb, RotateCcw, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { DetailSkeleton } from "@/components/ui/card-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useFeedback } from "@/hooks/use-feedback";
import { celebrate } from "@/lib/celebrate";
import { formatDateTime, formatDuration } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/routes";
import { CelebrationKinds, useCelebrationsStore } from "@/stores/celebrations";
import { useProjectContext } from "@/pages/projects/hooks/use-project-context";
import { useAttempt, useAttemptSummary, useCreateQuiz } from "@/features/quizzes/hooks/use-quizzes";
import { QuizModes, type ReviewConfig } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { getQuizModeLabel } from "@/config/constants/dropdowns/quizzes/quiz-mode-form.options";
import { ScoreHistoryChart } from "@/pages/projects/components/quiz/score-history-chart";
import { QuestionReviewList } from "./components/question-review-list";
import { TopicBreakdown } from "./components/topic-breakdown";
import { LessonComplete } from "./components/lesson-complete";
import { useIsPlayful } from "@/hooks/use-ui-mode";

export default function AttemptPage() {
    const { t } = useTranslation("attempt");
    const { projectId, project } = useProjectContext();
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();
    const summary = useAttemptSummary(attemptId);
    const detail = useAttempt(attemptId);
    const createReview = useCreateQuiz(projectId);
    const feedback = useFeedback();
    const pushCelebration = useCelebrationsStore((s) => s.push);
    const celebrated = useRef(false);
    const [xpRefreshed, setXpRefreshed] = useState(false);
    const playful = useIsPlayful();
    usePageMetadata({ title: t("page.title") });

    const data = summary.data;
    const attempt = data?.attempt;
    const analysis = attempt?.analysis;
    const isExam = data?.quiz.mode === QuizModes.EXAM;
    const target = data?.quiz.target_score ?? (isExam ? project.target_score : null);
    const passed = analysis?.passed ?? (target ? (attempt?.percentage ?? 0) >= target : (attempt?.percentage ?? 0) >= 70);

    // XP is granted asynchronously by the gamification domain — refresh once shortly after landing.
    useEffect(() => {
        if (!attemptId || xpRefreshed) return;
        const timer = setTimeout(() => {
            void summary.refetch();
            setXpRefreshed(true);
        }, 1500);
        return () => clearTimeout(timer);
    }, [attemptId, xpRefreshed, summary]);

    useEffect(() => {
        if (!attempt || attempt.status !== "COMPLETED" || celebrated.current) return;
        const fresh = attempt.completed_at && Date.now() - new Date(attempt.completed_at).getTime() < 60_000;
        celebrated.current = true;
        if (!fresh) return;
        if (attempt.percentage >= 100) {
            feedback.play("finishPass");
            celebrate("big");
            pushCelebration({ kind: CelebrationKinds.PERFECT, title: t("hero.perfect"), description: t("hero.perfectDescription") });
        } else if (passed) {
            feedback.play("finishPass");
            celebrate("burst");
        } else {
            feedback.play("finishFail");
        }
    }, [attempt, passed, feedback, pushCelebration]);

    const startReview = (review: ReviewConfig, title: string) =>
        createReview.mutate({ mode: QuizModes.REVIEW, review, title, count: Math.max(5, attempt?.incorrect_count ?? 5) }, { onSuccess: (q) => navigate(Routes.projects.quiz_take(projectId, q.id)) });

    if (summary.isError) {
        return (
            <Main>
                <EmptyState title={t("page.notFound")} description={summary.error.message} action={<Button asChild><Link to={Routes.projects.quizzes(projectId)}>{t("quiz:generation.backToQuizzes")}</Link></Button>} />
            </Main>
        );
    }
    if (!data || !attempt) {
        return (
            <Main>
                <DetailSkeleton />
            </Main>
        );
    }
    if (attempt.status !== "COMPLETED") {
        return (
            <Main>
                <EmptyState
                    title={t("page.inProgress")}
                    action={
                        <Button asChild>
                            <Link to={Routes.projects.quiz_take(projectId, data.quiz.id)}>{t("page.continue")}</Link>
                        </Button>
                    }
                />
            </Main>
        );
    }

    const total = attempt.correct_count + attempt.incorrect_count;
    const ringTone = attempt.percentage >= 85 ? "text-success" : attempt.percentage >= 60 ? "text-amber" : "text-destructive";
    const previousExam = analysis?.previous_exams?.find((e) => e.attempt_id !== attempt.id);
    const delta = previousExam ? attempt.percentage - previousExam.percentage : null;

    return (
        <>
        {playful && !isExam && <LessonComplete projectId={projectId} quizId={data.quiz.id} attempt={attempt} passed={passed} />}
        <Main width="wide" className="space-y-8">
            <div className={cn("flex flex-wrap items-center gap-2", playful && !isExam && "hidden")}>
                <Button variant="ghost" size="sm" asChild>
                    <Link to={isExam ? Routes.projects.exam(projectId) : Routes.projects.quizzes(projectId)}>
                        <ArrowLeft /> {isExam ? t("page.backExams") : t("page.backQuizzes")}
                    </Link>
                </Button>
            </div>

            <section className={cn("grid items-center gap-8 rounded-2xl border border-border bg-card p-6 sm:p-8 lg:grid-cols-[auto_1fr]", playful && !isExam && "hidden")}>
                <div className="mx-auto">
                    <ProgressRing value={attempt.percentage} size={168} strokeWidth={12} indicatorClassName={ringTone} label={t("hero.scoreLabel", { value: Math.round(attempt.percentage) })}>
                        <div className="text-center">
                            <AnimatedCounter value={attempt.percentage} suffix="%" className="font-display text-4xl" />
                            <div className="text-xs text-muted-foreground">{t("hero.score")}</div>
                        </div>
                    </ProgressRing>
                </div>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{getQuizModeLabel(data.quiz.mode)}</Badge>
                        <Badge variant="outline">{t("hero.attempt", { number: attempt.attempt_number })}</Badge>
                        {target ? (
                            <Badge className={cn("border-0", passed ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")}>
                                {passed ? t("hero.targetReached") : t("hero.belowTarget")} · {target}%
                            </Badge>
                        ) : null}
                    </div>
                    <h1 className="font-display text-3xl leading-tight sm:text-4xl">{attempt.percentage >= 100 ? t("hero.perfect") : passed ? t("hero.great") : t("hero.keepGoing")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("hero.completed", { title: data.quiz.title, date: formatDateTime(attempt.completed_at) })}
                        {delta !== null && (
                            <span className={cn("ml-2 font-medium", delta >= 0 ? "text-success" : "text-destructive")}>
                                {delta >= 0 ? "▲" : "▼"} {t("hero.delta", { count: Math.abs(Math.round(delta)) })}
                            </span>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {attempt.incorrect_count > 0 && (
                            <>
                                <Button onClick={() => startReview({ source: "attempt", attempt_id: attempt.id, strategy: "retry" }, t("actions.retryTitle", { title: data.quiz.title }))} loading={createReview.isPending} variant="outline">
                                    <RotateCcw /> {t("actions.retryIncorrect")}
                                </Button>
                                <Button onClick={() => startReview({ source: "attempt", attempt_id: attempt.id, strategy: "new_questions" }, t("actions.newQuestions"))} loading={createReview.isPending}>
                                    <Sparkles /> {t("actions.newQuestions")}
                                </Button>
                            </>
                        )}
                        <Button variant="ghost" asChild>
                            <Link to={Routes.projects.quiz_take(projectId, data.quiz.id)}>{t("actions.retake")}</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                <StatCard label={t("stats.correct")} value={attempt.correct_count} suffix={`/${total}`} icon={Target} tone="success" />
                <StatCard label={t("stats.time")} value={formatDuration(attempt.time_spent_sec)} icon={Clock} />
                <StatCard label={t("stats.xp")} value={attempt.xp_earned} suffix=" XP" icon={Zap} tone="primary" hint={!xpRefreshed ? t("stats.updating") : undefined} />
                <StatCard label={t("stats.bestCombo")} value={attempt.best_combo} suffix="x" icon={Flame} tone="warning" />
                <StatCard label={t("stats.avgDifficulty")} value={attempt.avg_difficulty ? attempt.avg_difficulty.toFixed(1) : "—"} icon={Trophy} />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="mb-4 text-sm font-medium">{t("sections.byTopic")}</h2>
                    {analysis?.by_topic?.length ? <TopicBreakdown rows={analysis.by_topic} reduceMotion={feedback.reduceMotion} /> : <p className="text-sm text-muted-foreground">{t("sections.noTopicData")}</p>}
                </div>
                <div className="space-y-6">
                    {!!analysis?.recommendations?.length && (
                        <div className="rounded-xl border border-border bg-card p-5">
                            <h2 className="mb-3 text-sm font-medium">{t("sections.next")}</h2>
                            <ul className="space-y-2 text-sm">
                                {analysis.recommendations.map((r) => (
                                    <li key={r} className="flex gap-2">
                                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden /> {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!!analysis?.missed_concepts?.length && (
                        <div className="rounded-xl border border-border bg-card p-5">
                            <h2 className="mb-3 text-sm font-medium">{t("sections.missed")}</h2>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis.missed_concepts.map((m) => (
                                    <Badge key={m.concept} variant="outline" className="font-normal">
                                        {m.concept}
                                        {m.count > 1 ? ` ×${m.count}` : ""}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {(data.history.length > 1 || (isExam && (analysis?.previous_exams?.length ?? 0) > 0)) && (
                <section className="rounded-xl border border-border bg-card p-5">
                    <h2 className="mb-3 text-sm font-medium">{isExam ? t("sections.examsOverTime") : t("sections.attemptsOnQuiz")}</h2>
                    <ScoreHistoryChart
                        target={target}
                        points={
                            isExam && analysis?.previous_exams?.length
                                ? [...[...analysis.previous_exams].reverse().map((e, i) => ({ label: t("chart.sim", { number: i + 1 }), percentage: e.percentage })), { label: t("chart.thisOne"), percentage: attempt.percentage }]
                                : data.history.map((h) => ({ label: t("quiz:chart.attempt", { number: h.attempt_number }), percentage: h.percentage }))
                        }
                    />
                </section>
            )}

            <div id="answers" className="scroll-mt-20" />
            {detail.data ? <QuestionReviewList projectId={projectId} questions={detail.data.questions} /> : <DetailSkeleton />}
        </Main>
        </>
    );
}
