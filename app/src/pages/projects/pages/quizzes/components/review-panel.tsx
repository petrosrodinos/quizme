import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { formatDate } from "@/lib/date";
import { useReviewOverview } from "@/features/quizzes/hooks/use-quizzes";
import type { ReviewConfig } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { getQuestionTypeLabel } from "@/config/constants/dropdowns/quizzes/question-type-form.options";

interface ReviewPanelProps {
    projectId: string;
    onStartReview: (review: ReviewConfig, title: string) => void;
    pending: boolean;
}

/** Wrong-answer review: retry everything, by attempt, or by topic — or generate new questions on the same concepts. */
export const ReviewPanel = ({ projectId, onStartReview, pending }: ReviewPanelProps) => {
    const { data, isPending } = useReviewOverview(projectId);
    if (isPending) return <ListSkeleton rows={4} />;
    if (!data?.total_missed) {
        return <EmptyState icon={CheckCircle2} title="Nothing to review" description="You have no outstanding incorrect answers. Keep practising to find new weak spots." compact />;
    }
    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="font-display text-3xl">{data.total_missed}</div>
                            <div className="text-sm text-muted-foreground">questions still answered incorrectly</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" disabled={pending} onClick={() => onStartReview({ source: "all_incorrect", strategy: "retry" }, "Retry all mistakes")}>
                                <RotateCcw /> Retry all incorrect
                            </Button>
                            <Button disabled={pending} onClick={() => onStartReview({ source: "all_incorrect", strategy: "new_questions" }, "New questions on missed concepts")}>
                                <Sparkles /> New questions, same concepts
                            </Button>
                        </div>
                    </div>
                    {!!data.weak_concepts.length && (
                        <div className="mt-4">
                            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Concepts you keep missing</div>
                            <div className="flex flex-wrap gap-1.5">
                                {data.weak_concepts.map((c) => (
                                    <Badge key={c.concept} variant="outline" className="font-normal">
                                        {c.concept} · {c.misses}/{c.attempts}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-border bg-card">
                    <div className="border-b border-border px-5 py-3 text-sm font-medium">Missed questions</div>
                    <ul className="divide-y divide-border">
                        {data.questions.slice(0, 20).map((q) => (
                            <li key={q.id} className="px-5 py-3 text-sm">
                                <div className="line-clamp-2">{q.prompt}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {getQuestionTypeLabel(q.type)} · {q.topic?.name ?? "General"}
                                    {q.concept ? ` · ${q.concept}` : ""}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 text-sm font-medium">By topic</div>
                    <ul className="space-y-2">
                        {data.by_topic.map((t) => (
                            <li key={t.topic_id ?? "none"} className="flex items-center gap-2 text-sm">
                                <span className="flex-1 truncate">{t.topic}</span>
                                <Badge variant="secondary">{t.count}</Badge>
                                {t.topic_id && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={pending}
                                        onClick={() => onStartReview({ source: "topic", topic_id: t.topic_id!, strategy: "new_questions" }, `Review: ${t.topic}`)}
                                    >
                                        Review
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                {!!data.attempts.length && (
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 text-sm font-medium">From a specific attempt</div>
                        <ul className="space-y-2">
                            {data.attempts.map((a) => (
                                <li key={a.id} className="flex items-center gap-2 text-sm">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate">{a.quiz.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            #{a.attempt_number} · {formatDate(a.completed_at)} · {a.incorrect_count} wrong
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={pending}
                                        onClick={() => onStartReview({ source: "attempt", attempt_id: a.id, strategy: "retry" }, `Retry: ${a.quiz.title}`)}
                                    >
                                        Retry
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};
