import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, BarChart3, Loader2, MoreHorizontal, Play, RotateCw, Share2, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Routes } from "@/routes/routes";
import { formatRelative } from "@/lib/date";
import { translateServerMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { getQuizModeLabel } from "@/config/constants/dropdowns/quizzes/quiz-mode-form.options";
import { getGenerationStatusLabel } from "@/config/constants/dropdowns/quizzes/generation-status.options";
import type { Quiz } from "@/features/quizzes/interfaces/quizzes.interfaces";

interface QuizCardProps {
    projectId: string;
    quiz: Quiz;
    canShare: boolean;
    canDelete: boolean;
    onDelete: (quiz: Quiz) => void;
    onShare: (quiz: Quiz) => void;
    onResults: (quiz: Quiz) => void;
}

export const QuizCard = ({ projectId, quiz, canShare, canDelete, onDelete, onShare, onResults }: QuizCardProps) => {
    const { t } = useTranslation("quizzes");
    const generating = quiz.status === "PENDING" || quiz.status === "GENERATING";
    const failed = quiz.status === "FAILED";
    const best = quiz.best_percentage;
    return (
        <div className={cn("flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm", generating && "border-dashed")}>
            <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">{getQuizModeLabel(quiz.mode)}</Badge>
                        {quiz.is_shared && (
                            <Badge variant="outline" className="gap-1">
                                <Users className="h-3 w-3" /> {t("card.shared")}
                            </Badge>
                        )}
                    </div>
                    <h3 className="truncate font-medium" title={quiz.title}>
                        {quiz.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {t("common:count.question", { count: quiz.question_count ?? 0 })} · {formatRelative(quiz.created_at)}
                        {quiz.time_limit_sec ? ` · ${t("common:units.min", { count: Math.round(quiz.time_limit_sec / 60) })}` : ""}
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("card.actionsFor", { title: quiz.title })}>
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {quiz.is_shared && (
                            <DropdownMenuItem onClick={() => onResults(quiz)}>
                                <BarChart3 /> {t("card.groupResults")}
                            </DropdownMenuItem>
                        )}
                        {canShare && !quiz.is_shared && quiz.status === "READY" && (
                            <DropdownMenuItem onClick={() => onShare(quiz)}>
                                <Share2 /> {t("card.shareWithMembers")}
                            </DropdownMenuItem>
                        )}
                        {canDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(quiz)}>
                                    <Trash2 /> {t("common:actions.delete")}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
                {generating ? (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" /> {getGenerationStatusLabel(quiz.status)}
                    </span>
                ) : failed ? (
                    <span className="inline-flex items-center gap-2 text-sm text-destructive" title={quiz.error_message ? translateServerMessage(quiz.error_message) : undefined}>
                        <AlertTriangle className="h-4 w-4" /> {quiz.error_message ? translateServerMessage(quiz.error_message).slice(0, 80) : t("card.generationFailed")}
                    </span>
                ) : (
                    <div>
                        <div className="font-display text-3xl leading-none">{best !== null && best !== undefined ? `${Math.round(best)}%` : "—"}</div>
                        <div className="text-xs text-muted-foreground">
                            {quiz.attempt_count ? t("card.bestOf", { count: quiz.attempt_count }) : t("card.notAttempted")}
                        </div>
                    </div>
                )}
                {!failed && (
                    <Button asChild size="sm" variant={quiz.attempt_count ? "outline" : "default"} disabled={generating}>
                        <Link to={Routes.projects.quiz_take(projectId, quiz.id)}>
                            {quiz.in_progress_attempt_id ? (
                                <>
                                    <Play /> {t("card.resume")}
                                </>
                            ) : quiz.attempt_count ? (
                                <>
                                    <RotateCw /> {t("card.retake")}
                                </>
                            ) : (
                                <>
                                    <Play /> {generating ? t("card.open") : t("card.start")}
                                </>
                            )}
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
};
