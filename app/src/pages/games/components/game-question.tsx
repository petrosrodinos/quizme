import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuestionInput, isAnswerReady } from "@/pages/projects/components/quiz/question-inputs";
import { cn } from "@/lib/utils";
import type { AnswerValue, AttemptQuestion } from "@/features/quizzes/interfaces/quizzes.interfaces";
import type { GameReveal, GameState } from "@/features/games/interfaces/games.interfaces";
import { useTranslation } from "react-i18next";

interface GameQuestionProps {
    game: GameState;
    /** Server clock minus local clock (ms) to keep countdowns in sync. */
    clockOffset: number;
    answered: boolean;
    myAnswer: AnswerValue;
    onAnswerChange: (v: AnswerValue) => void;
    onSubmit: () => void;
    submitting: boolean;
    reveal: GameReveal | null;
    onTick?: (secondsLeft: number) => void;
}

export const GameQuestion = ({ game, clockOffset, answered, myAnswer, onAnswerChange, onSubmit, submitting, reveal, onTick }: GameQuestionProps) => {
    const { t } = useTranslation("games");
    const question = useMemo<AttemptQuestion | null>(() => (game.question ? { ...game.question, response: null } : null), [game.question]);
    const deadline = game.deadline_at ? new Date(game.deadline_at).getTime() : 0;
    const total = game.seconds_per_question * 1000;
    const [left, setLeft] = useState(() => Math.max(0, deadline - (Date.now() + clockOffset)));

    useEffect(() => {
        const tick = () => {
            const ms = Math.max(0, deadline - (Date.now() + clockOffset));
            setLeft(ms);
            onTick?.(Math.ceil(ms / 1000));
        };
        tick();
        const id = window.setInterval(tick, 250);
        return () => window.clearInterval(id);
    }, [deadline, clockOffset, onTick]);

    if (!question) return null;
    const locked = answered || !!reveal || left === 0;
    const answeredCount = game.players.filter((p) => p.answered_current).length;
    const seconds = Math.ceil(left / 1000);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                    {t("question.progress", { current: game.current_index + 1, total: game.total })}
                </span>
                <span className={cn("flex items-center gap-1.5 font-medium tabular-nums", seconds <= 5 && !reveal && "text-destructive")} aria-live={seconds <= 5 ? "assertive" : "off"}>
                    <Clock className="h-4 w-4" aria-hidden /> {reveal ? t("question.timesUp") : t("common:units.s", { count: seconds })}
                </span>
            </div>
            <Progress value={reveal ? 0 : (left / total) * 100} aria-label={t("question.timeRemaining")} />
            <h2 className="font-display text-2xl leading-snug">{question.prompt}</h2>
            <QuestionInput question={question} value={myAnswer} onChange={onAnswerChange} disabled={locked} correct={reveal?.correct_answer ?? null} keyboard={!locked} onSubmitShortcut={onSubmit} />
            {!reveal ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground" role="status">
                        {t("question.answeredCount", { answered: answeredCount, total: game.players.length })}
                    </p>
                    {answered ? (
                        <p className="text-sm font-medium">{t("question.locked")}</p>
                    ) : (
                        <Button onClick={onSubmit} disabled={!isAnswerReady(question, myAnswer) || left === 0} loading={submitting}>
                            {t("question.lockIn")}
                        </Button>
                    )}
                </div>
            ) : reveal.explanation ? (
                <p className="rounded-lg bg-surface-card p-3 text-sm">{reveal.explanation}</p>
            ) : null}
        </div>
    );
};
