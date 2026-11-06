import { Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/date";
import { useQuizResults } from "@/features/quizzes/hooks/use-quizzes";

interface GroupResultsDialogProps {
    quizId: string | null;
    onClose: () => void;
}

/** Shared quiz: individual scores, group average, leaderboard and per-question difficulty. */
export const GroupResultsDialog = ({ quizId, onClose }: GroupResultsDialogProps) => {
    const { data, isPending } = useQuizResults(quizId ?? undefined);
    return (
        <Dialog open={!!quizId} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-normal">{data?.quiz.title ?? "Group results"}</DialogTitle>
                    <DialogDescription>
                        {data ? `${data.participants} participant${data.participants === 1 ? "" : "s"} · group average ${data.group_average ?? "—"}%` : "Loading results"}
                    </DialogDescription>
                </DialogHeader>
                {isPending || !data ? (
                    <ListSkeleton rows={4} />
                ) : (
                    <div className="space-y-6">
                        <section>
                            <h3 className="mb-2 text-sm font-medium">Leaderboard</h3>
                            {data.leaderboard.length ? (
                                <ol className="space-y-1.5">
                                    {data.leaderboard.map((row) => (
                                        <li
                                            key={`${row.rank}-${row.name}`}
                                            className={cn("flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm", row.is_me && "border-primary bg-primary/5")}
                                        >
                                            <span className="w-6 text-center font-semibold tabular-nums">{row.rank <= 3 ? <Trophy className={cn("mx-auto h-4 w-4", row.rank === 1 ? "text-amber" : "text-muted-foreground")} /> : row.rank}</span>
                                            <span className="flex-1 truncate">
                                                {row.name}
                                                {row.is_me && " (you)"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{formatDuration(row.time_spent_sec)}</span>
                                            <span className="w-12 text-right font-medium tabular-nums">{Math.round(row.percentage)}%</span>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nobody has completed this quiz yet.</p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">Names are shown only for members who opted into leaderboards.</p>
                        </section>
                        <section>
                            <h3 className="mb-2 text-sm font-medium">Question difficulty (hardest first)</h3>
                            <ul className="space-y-3">
                                {data.question_difficulty.map((q) => (
                                    <li key={q.question_id} className="text-sm">
                                        <div className="mb-1 flex gap-2">
                                            <span className="line-clamp-2 flex-1">{q.prompt}</span>
                                            <span className="shrink-0 tabular-nums text-muted-foreground">{q.percent_correct}% correct</span>
                                        </div>
                                        <Progress value={q.percent_correct} className="h-1.5" />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
