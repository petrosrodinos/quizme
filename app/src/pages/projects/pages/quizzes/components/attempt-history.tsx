import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/card-skeletons";
import { Badge } from "@/components/ui/badge";
import { Routes } from "@/routes/routes";
import { formatDateTime, formatDuration } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useAttemptHistory } from "@/features/quizzes/hooks/use-quizzes";
import { getQuizModeLabel } from "@/config/constants/dropdowns/quizzes/quiz-mode-form.options";
import { ScoreHistoryChart } from "@/pages/projects/components/quiz/score-history-chart";

interface AttemptHistoryProps {
    projectId: string;
    targetScore?: number | null;
}

const scoreTone = (p: number) => (p >= 80 ? "text-success" : p >= 60 ? "text-warning" : "text-destructive");

export const AttemptHistory = ({ projectId, targetScore }: AttemptHistoryProps) => {
    const { t } = useTranslation("quizzes");
    const { data, isPending } = useAttemptHistory(projectId, { limit: 100 });
    if (isPending) return <ListSkeleton rows={5} />;
    if (!data?.length) return <EmptyState icon={History} title={t("history.emptyTitle")} description={t("history.emptyDescription")} compact />;
    const chronological = [...data].reverse();
    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 text-sm font-medium">{t("history.scoreOverTime")}</div>
                <ScoreHistoryChart points={chronological.map((a, i) => ({ label: `#${i + 1}`, percentage: a.percentage }))} target={targetScore} />
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("history.columns.quiz")}</TableHead>
                            <TableHead className="text-right">{t("history.columns.attempt")}</TableHead>
                            <TableHead>{t("history.columns.date")}</TableHead>
                            <TableHead className="text-right">{t("history.columns.score")}</TableHead>
                            <TableHead className="text-right">%</TableHead>
                            <TableHead className="text-right">{t("history.columns.correct")}</TableHead>
                            <TableHead className="text-right">{t("history.columns.incorrect")}</TableHead>
                            <TableHead className="text-right">{t("history.columns.time")}</TableHead>
                            <TableHead className="text-right">{t("history.columns.difficulty")}</TableHead>
                            <TableHead>{t("history.columns.missed")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((a) => (
                            <TableRow key={a.id}>
                                <TableCell className="max-w-56">
                                    <Link to={Routes.projects.attempt(projectId, a.id)} className="block truncate font-medium hover:text-primary hover:underline">
                                        {a.quiz.title}
                                    </Link>
                                    <span className="text-xs text-muted-foreground">{getQuizModeLabel(a.quiz.mode)}</span>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">#{a.attempt_number}</TableCell>
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(a.completed_at)}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {Math.round(a.score * 10) / 10}/{a.max_score}
                                </TableCell>
                                <TableCell className={cn("text-right font-medium tabular-nums", scoreTone(a.percentage))}>{Math.round(a.percentage)}%</TableCell>
                                <TableCell className="text-right tabular-nums">{a.correct_count}</TableCell>
                                <TableCell className="text-right tabular-nums">{a.incorrect_count}</TableCell>
                                <TableCell className="text-right tabular-nums">{formatDuration(a.time_spent_sec)}</TableCell>
                                <TableCell className="text-right tabular-nums">{a.avg_difficulty ? a.avg_difficulty.toFixed(1) : "—"}</TableCell>
                                <TableCell className="max-w-64">
                                    <div className="flex flex-wrap gap-1">
                                        {a.missed.slice(0, 3).map((m) => (
                                            <Badge key={m.concept} variant="outline" className="font-normal">
                                                {m.concept}
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
