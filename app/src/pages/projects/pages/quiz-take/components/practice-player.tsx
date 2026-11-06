import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ComboBadge } from "@/components/ui/combo-badge";
import { useFeedback } from "@/hooks/use-feedback";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import { useSubmitAnswer } from "@/features/quizzes/hooks/use-quizzes";
import type { AnswerResult, AnswerValue, AttemptDetail, CorrectAnswer } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { getQuestionTypeLabel } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { getQuestionDifficultyLabel } from "@/config/constants/dropdowns/quizzes/question-difficulty-form.options";
import { QuestionInput, isAnswerReady } from "@/pages/projects/components/quiz/question-inputs";
import { EvaluationPanel, FeedbackBanner, SourceCitation } from "@/pages/projects/components/quiz/answer-feedback";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

interface PracticePlayerProps {
    projectId: string;
    detail: AttemptDetail;
    onFinish: () => void;
    onExit: () => void;
    finishing: boolean;
}

const COMBO_MILESTONES = new Set([3, 5, 10, 15, 20]);

/** One-question-at-a-time player with instant, animated feedback (practice / adaptive / review / selection). */
export const PracticePlayer = ({ projectId, detail, onFinish, onExit, finishing }: PracticePlayerProps) => {
    const { attempt, questions, quiz } = detail;
    const feedback = useFeedback();
    const submit = useSubmitAnswer(attempt.id);
    const cardRef = useRef<HTMLDivElement>(null);
    const startedAt = useRef(Date.now());

    const initialResults = useMemo(() => {
        const map: Record<string, AnswerResult> = {};
        for (const q of questions) {
            if (q.response?.answered && typeof q.response.is_correct === "boolean") {
                map[q.id] = {
                    question_id: q.id,
                    is_correct: q.response.is_correct,
                    score: q.response.score,
                    correct_answer: (q.response.correct_answer ?? q.response.feedback?.correct_answer) as CorrectAnswer,
                    explanation: q.response.explanation,
                    feedback: q.response.feedback?.verdict ? (q.response.feedback as AnswerResult["feedback"]) : null,
                    source_ref: q.source_ref,
                };
            }
        }
        return map;
    }, [questions]);

    const [results, setResults] = useState<Record<string, AnswerResult>>(initialResults);
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() =>
        Object.fromEntries(questions.filter((q) => q.response?.answer).map((q) => [q.id, q.response!.answer])),
    );
    const [index, setIndex] = useState(() => {
        const first = questions.findIndex((q) => !initialResults[q.id]);
        return first === -1 ? Math.max(0, questions.length - 1) : first;
    });
    const [combo, setCombo] = useState(attempt.current_combo);

    const question = questions[index];
    const value = answers[question?.id] ?? {};
    const result = question ? results[question.id] : undefined;
    const answeredCount = Object.keys(results).length;
    const isLast = index === questions.length - 1;

    useEffect(() => {
        startedAt.current = Date.now();
    }, [index]);

    useRealtimeEvent<{ amount: number; source_id?: string }>(RealtimeEvents.XP_GAINED, (payload) => {
        if (payload.source_id?.startsWith(`${attempt.id}:`)) feedback.showXp(payload.amount, cardRef.current);
    });

    const handleSubmit = useCallback(() => {
        if (!question || result || submit.isPending || !isAnswerReady(question, value)) return;
        submit.mutate(
            { question_id: question.id, answer: value, time_spent_ms: Date.now() - startedAt.current },
            {
                onSuccess: (res) => {
                    setResults((r) => ({ ...r, [question.id]: res }));
                    const nextCombo = res.combo ?? 0;
                    setCombo(nextCombo);
                    if (res.is_correct) {
                        feedback.play("correct", { combo: nextCombo });
                        feedback.haptic("correct");
                        if (COMBO_MILESTONES.has(nextCombo) && feedback.showCombos) feedback.play("combo");
                    } else {
                        feedback.play("wrong");
                        feedback.haptic("wrong");
                    }
                },
            },
        );
    }, [question, result, submit, value, feedback]);

    const handleNext = useCallback(() => {
        if (isLast) onFinish();
        else setIndex((i) => i + 1);
    }, [isLast, onFinish]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Enter" || e.shiftKey || e.metaKey || e.ctrlKey) return;
            const t = e.target as HTMLElement;
            if (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "BUTTON") return;
            e.preventDefault();
            if (result) handleNext();
            else handleSubmit();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [result, handleNext, handleSubmit]);

    if (!question) return null;
    const ready = isAnswerReady(question, value);
    const correctAnswer = result?.correct_answer ?? null;

    return (
        <div className="mx-auto w-full max-w-3xl space-y-5">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onExit} aria-label="Exit quiz">
                    <X />
                </Button>
                <div className="flex-1">
                    <Progress value={((answeredCount + (result ? 0 : 0)) / questions.length) * 100} className="h-2" aria-label="Quiz progress" />
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                    {index + 1}/{questions.length}
                </span>
                {feedback.showCombos && <ComboBadge combo={combo} />}
            </div>

            <div ref={cardRef} key={question.id} className="animate-pop space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">{getQuestionTypeLabel(question.type)}</Badge>
                    <Badge variant="outline">{getQuestionDifficultyLabel(question.difficulty)}</Badge>
                    {question.concept && <span className="text-muted-foreground">· {question.concept}</span>}
                    <span className="ml-auto text-muted-foreground">{quiz.title}</span>
                </div>
                <div className="font-display text-xl leading-snug sm:text-2xl">
                    <Markdown content={question.prompt} />
                </div>

                <QuestionInput
                    question={question}
                    value={value}
                    onChange={(v) => setAnswers((a) => ({ ...a, [question.id]: v }))}
                    disabled={!!result || submit.isPending}
                    correct={correctAnswer}
                    keyboard={!result}
                    onSubmitShortcut={handleSubmit}
                />

                {result && (
                    <div className="space-y-3">
                        <FeedbackBanner isCorrect={!!result.is_correct} score={result.score} previouslyMissed={result.previously_missed} />
                        {result.feedback && question.type === "FREE_TEXT" && <EvaluationPanel evaluation={result.feedback} />}
                        {result.explanation && (
                            <div className="rounded-xl bg-surface p-4 text-sm leading-relaxed">
                                <div className="mb-1 font-medium">Explanation</div>
                                <Markdown content={result.explanation} />
                            </div>
                        )}
                        <SourceCitation projectId={projectId} source={result.source_ref ?? question.source_ref} />
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                    {!result ? (
                        <Button onClick={handleSubmit} disabled={!ready || submit.isPending} className="min-w-32">
                            {submit.isPending ? (
                                <>
                                    <Loader2 className="animate-spin" /> {question.type === "FREE_TEXT" ? "Grading…" : "Checking…"}
                                </>
                            ) : (
                                "Check answer"
                            )}
                        </Button>
                    ) : (
                        <Button onClick={handleNext} loading={finishing} className={cn("min-w-32")} autoFocus>
                            {isLast ? "See results" : "Next question"} <ArrowRight />
                        </Button>
                    )}
                </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">Press Enter to check / continue · number keys pick options</p>
        </div>
    );
};
