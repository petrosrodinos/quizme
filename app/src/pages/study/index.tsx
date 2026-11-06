import { lazy, Suspense, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Layers, Sparkles } from "lucide-react";
import { Main } from "@/components/layout/main";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageMetadata } from "@/hooks/use-page-metadata";
import { useFeedback } from "@/hooks/use-feedback";
import { useStudyHeartbeat } from "@/hooks/use-study-heartbeat";
import { useCelebrationsStore, CelebrationKinds } from "@/stores/celebrations";
import { celebrate } from "@/lib/celebrate";
import { Routes } from "@/routes/routes";
import { useProjects } from "@/features/projects/hooks/use-projects";
import { useCompleteDailySession, useDailySession, useStartSessionQuiz } from "@/features/study/hooks/use-study";
import { SessionBlockTypes, StudyActivityTypes, type SessionBlock } from "@/features/study/interfaces/study.interfaces";
import { QuizModes, ReviewSources, ReviewStrategies } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { SessionBlockCard } from "./components/session-block-card";

const ReviewSession = lazy(() =>
    import("@/pages/projects/pages/flashcards-review/components/review-session").then((m) => ({ default: m.ReviewSession })),
);

const ALL = "all";
/** Session links come from the API; only follow internal paths. */
const internalLink = (link?: string | null) => (link && link.startsWith("/") && !link.startsWith("//") ? link : null);

export default function StudyPage() {
    usePageMetadata({ title: "Today's study" });
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const projectId = params.get("project_id") ?? undefined;
    const reviewMode = params.get("mode") === "review";
    const [startingIndex, setStartingIndex] = useState<number | null>(null);

    const { data: projects } = useProjects({ view: "active" });
    const { data, isPending, isError, error, refetch } = useDailySession(projectId);
    const startQuiz = useStartSessionQuiz();
    const complete = useCompleteDailySession();
    const pushCelebration = useCelebrationsStore((s) => s.push);
    const { play } = useFeedback();
    useStudyHeartbeat({ projectId, type: StudyActivityTypes.DAILY_SESSION });

    const setProject = (value: string) => {
        const next = new URLSearchParams(params);
        if (value === ALL) next.delete("project_id");
        else next.set("project_id", value);
        next.delete("mode");
        setParams(next, { replace: true });
    };

    const start = (block: SessionBlock, index: number) => {
        const pid = block.project_id ?? data?.focus_project?.id;
        if ((block.type === SessionBlockTypes.ADAPTIVE_QUIZ || block.type === SessionBlockTypes.WEAK_TOPICS) && pid) {
            setStartingIndex(index);
            const dto =
                block.type === SessionBlockTypes.ADAPTIVE_QUIZ
                    ? { mode: QuizModes.ADAPTIVE, count: 10 }
                    : { mode: QuizModes.REVIEW, count: 8, review: { source: ReviewSources.ALL_INCORRECT, strategy: ReviewStrategies.NEW_QUESTIONS } };
            startQuiz.mutate(
                { projectId: pid, dto },
                {
                    onSuccess: (quiz) => navigate(Routes.projects.quiz_take(pid, quiz.id)),
                    onError: () => block.type === SessionBlockTypes.WEAK_TOPICS && navigate(Routes.projects.quizzes(pid)),
                    onSettled: () => setStartingIndex(null),
                },
            );
            return;
        }
        if (block.type === SessionBlockTypes.FLASHCARDS && pid && block.project_id) return navigate(Routes.projects.flashcards_review(pid));
        const link = internalLink(block.link);
        if (link) navigate(link);
    };

    const finish = () =>
        complete.mutate(undefined, {
            onSuccess: () => {
                play("goal");
                celebrate("big");
                pushCelebration({ kind: CelebrationKinds.DAILY_GOAL, title: "Daily session complete", description: "Consistency is what makes knowledge stick." });
            },
        });

    const goalPct = data ? Math.min(100, Math.round((data.progress.minutes / Math.max(1, data.goal_minutes)) * 100)) : 0;

    return (
        <Main width="default">
            <PageHeader
                eyebrow="Study mode"
                title="Today's recommended session"
                description="Picked for you from your exam dates, knowledge gaps, spaced-repetition schedule and recent activity."
                actions={
                    <Select value={projectId ?? ALL} onValueChange={setProject}>
                        <SelectTrigger className="w-[220px]" aria-label="Choose project">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All projects</SelectItem>
                            {(projects ?? []).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
            />

            {reviewMode && (
                <section className="mb-6 rounded-xl border border-border bg-card p-5" aria-labelledby="review-heading">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 id="review-heading" className="inline-flex items-center gap-2 font-display text-lg">
                            <Layers className="h-4 w-4 text-primary" aria-hidden /> Flashcard review
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                const next = new URLSearchParams(params);
                                next.delete("mode");
                                setParams(next, { replace: true });
                            }}
                        >
                            Back to session
                        </Button>
                    </div>
                    <Suspense fallback={<ListSkeleton rows={2} />}>
                        <ReviewSession
                            projectId={projectId}
                            onFinish={() => {
                                const next = new URLSearchParams(params);
                                next.delete("mode");
                                setParams(next, { replace: true });
                                refetch();
                            }}
                        />
                    </Suspense>
                </section>
            )}

            {isPending ? (
                <ListSkeleton rows={4} />
            ) : isError || !data ? (
                <EmptyState
                    title="Couldn't build today's session"
                    description={error?.message}
                    action={
                        <Button variant="outline" onClick={() => refetch()}>
                            Try again
                        </Button>
                    }
                />
            ) : (
                <div className="space-y-6">
                    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6" aria-label="Progress today">
                        <ProgressRing value={goalPct} size={104} label="Daily goal progress" indicatorClassName={data.progress.goal_met ? "stroke-success" : undefined}>
                            <span className="font-display text-2xl">{data.progress.minutes}</span>
                            <span className="text-[11px] text-muted-foreground">of {data.goal_minutes} min</span>
                        </ProgressRing>
                        <div className="grid flex-1 grid-cols-3 gap-4 text-center sm:text-left">
                            <div>
                                <div className="font-display text-2xl">{data.total_minutes}</div>
                                <div className="text-xs text-muted-foreground">min planned</div>
                            </div>
                            <div>
                                <div className="font-display text-2xl">{data.progress.questions ?? 0}</div>
                                <div className="text-xs text-muted-foreground">questions today</div>
                            </div>
                            <div>
                                <div className="font-display text-2xl">{data.progress.cards ?? 0}</div>
                                <div className="text-xs text-muted-foreground">cards today</div>
                            </div>
                        </div>
                        {data.completed ? (
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-success">
                                <CheckCircle2 className="h-5 w-5" aria-hidden /> Session complete
                            </span>
                        ) : (
                            <Button onClick={finish} loading={complete.isPending} disabled={!data.blocks.length} variant="outline">
                                <Sparkles /> Complete session
                            </Button>
                        )}
                    </section>

                    {data.blocks.length ? (
                        <ol className="space-y-3" aria-label="Session steps">
                            {data.blocks.map((b, i) => (
                                <SessionBlockCard key={`${b.type}-${i}`} block={b} index={i} onStart={(block) => start(block, i)} isStarting={startingIndex === i && startQuiz.isPending} />
                            ))}
                        </ol>
                    ) : (
                        <EmptyState
                            title="Nothing to study yet"
                            description="Create a project and upload your material to get a personalised daily session."
                            action={
                                <Button asChild>
                                    <Link to={Routes.projects.root}>Go to projects</Link>
                                </Button>
                            }
                        />
                    )}
                </div>
            )}
        </Main>
    );
}
