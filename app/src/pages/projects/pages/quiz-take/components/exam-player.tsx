import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Markdown } from "@/components/ui/markdown";
import { usePreferencesStore } from "@/stores/preferences";
import { useSubmitAnswer } from "@/features/quizzes/hooks/use-quizzes";
import type { AnswerValue, AttemptDetail } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { getQuestionTypeLabel } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { QuestionInput, isAnswerReady } from "@/pages/projects/components/quiz/question-inputs";
import { cn } from "@/lib/utils";
import { ExamTimer } from "./exam-timer";
import { QuestionNavigator } from "./question-navigator";

interface ExamPlayerProps {
    detail: AttemptDetail;
    onFinish: () => void;
    finishing: boolean;
}

/**
 * Distraction-free exam simulation: no feedback until the end, free navigation, flags,
 * answers can be changed until submission, server-synced countdown with auto-submit.
 */
export const ExamPlayer = ({ detail, onFinish, finishing }: ExamPlayerProps) => {
    const { t } = useTranslation("quiz");
    const { attempt, questions, quiz, server_time } = detail;
    const setExamMode = usePreferencesStore((s) => s.setExamMode);
    const submit = useSubmitAnswer(attempt.id);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>(() =>
        Object.fromEntries(questions.filter((q) => q.response?.answer).map((q) => [q.id, q.response!.answer])),
    );
    const [saved, setSaved] = useState<Set<string>>(() => new Set(questions.filter((q) => q.response?.answered).map((q) => q.id)));
    const dirty = useRef(new Set<string>());
    const [flagged, setFlagged] = useState<Set<number>>(new Set());
    const [confirmOpen, setConfirmOpen] = useState(false);
    const visitStart = useRef(Date.now());

    useEffect(() => {
        setExamMode(true);
        return () => setExamMode(false);
    }, [setExamMode]);

    const question = questions[index];

    /** Persists the current question's answer if it changed. */
    const persist = useCallback(
        async (qIndex: number) => {
            const q = questions[qIndex];
            if (!q || !dirty.current.has(q.id)) return;
            const value = answers[q.id];
            if (!value || !isAnswerReady(q, value)) return;
            dirty.current.delete(q.id);
            const spent = Date.now() - visitStart.current;
            try {
                await submit.mutateAsync({ question_id: q.id, answer: value, time_spent_ms: spent });
                setSaved((s) => new Set(s).add(q.id));
            } catch {
                dirty.current.add(q.id);
            }
        },
        [answers, questions, submit],
    );

    const goTo = useCallback(
        (next: number) => {
            void persist(index);
            visitStart.current = Date.now();
            setIndex(Math.max(0, Math.min(questions.length - 1, next)));
        },
        [index, persist, questions.length],
    );

    const finish = useCallback(async () => {
        setConfirmOpen(false);
        await Promise.all(questions.map((_, i) => persist(i)));
        onFinish();
    }, [persist, questions, onFinish]);

    const answeredIdx = useMemo(
        () => new Set(questions.map((q, i) => (saved.has(q.id) || (answers[q.id] && isAnswerReady(q, answers[q.id])) ? i : -1)).filter((i) => i >= 0)),
        [questions, saved, answers],
    );
    const unanswered = questions.length - answeredIdx.size;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
            if (e.key === "ArrowRight" || (e.key === "Enter" && target.tagName !== "BUTTON")) {
                e.preventDefault();
                if (index < questions.length - 1) goTo(index + 1);
            }
            if (e.key === "ArrowLeft") goTo(index - 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [goTo, index, questions.length]);

    if (!question) return null;

    return (
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_260px]">
            <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-xl">{quiz.title}</h1>
                    <Badge variant="outline">{t("exam.mode")}</Badge>
                    <div className="ml-auto">{attempt.deadline_at && <ExamTimer deadline={attempt.deadline_at} serverTime={server_time} onExpire={finish} />}</div>
                </div>

                <div key={question.id} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{t("exam.question", { number: index + 1 })}</span> {t("exam.of", { total: questions.length })} · {getQuestionTypeLabel(question.type)}
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("ml-auto", flagged.has(index) && "text-amber")}
                            aria-pressed={flagged.has(index)}
                            onClick={() =>
                                setFlagged((f) => {
                                    const n = new Set(f);
                                    if (n.has(index)) n.delete(index);
                                    else n.add(index);
                                    return n;
                                })
                            }
                        >
                            <Flag className={cn(flagged.has(index) && "fill-amber")} /> {flagged.has(index) ? t("exam.flagged") : t("exam.flag")}
                        </Button>
                    </div>
                    <div className="font-display text-xl leading-snug sm:text-2xl">
                        <Markdown content={question.prompt} />
                    </div>
                    <QuestionInput
                        question={question}
                        value={answers[question.id] ?? {}}
                        onChange={(v) => {
                            dirty.current.add(question.id);
                            setAnswers((a) => ({ ...a, [question.id]: v }));
                        }}
                        keyboard
                        onSubmitShortcut={() => index < questions.length - 1 && goTo(index + 1)}
                    />
                    <div className="flex items-center justify-between border-t border-border pt-4">
                        <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
                            <ArrowLeft /> {t("common:actions.previous")}
                        </Button>
                        {index < questions.length - 1 ? (
                            <Button onClick={() => goTo(index + 1)}>
                                {t("common:actions.next")} <ArrowRight />
                            </Button>
                        ) : (
                            <Button onClick={() => setConfirmOpen(true)} loading={finishing}>
                                <Send /> {t("exam.submit")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="mb-3 text-sm font-medium">
                        {t("exam.answeredCount", { done: answeredIdx.size, total: questions.length })}
                    </div>
                    <QuestionNavigator total={questions.length} current={index} answered={answeredIdx} flagged={flagged} onSelect={goTo} />
                </div>
                <Button className="w-full" variant="secondary" onClick={() => setConfirmOpen(true)} loading={finishing}>
                    <Send /> {t("exam.submit")}
                </Button>
            </aside>

            <ConfirmationDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={finish}
                title={t("exam.confirmTitle")}
                description={
                    unanswered
                        ? flagged.size
                            ? t("exam.confirmUnansweredFlagged", { count: unanswered, flagged: flagged.size })
                            : t("exam.confirmUnanswered", { count: unanswered })
                        : flagged.size
                            ? t("exam.confirmFlagged", { count: flagged.size })
                            : t("exam.confirmFinal")
                }
                confirmText={t("exam.submit")}
                isLoading={finishing}
            />
        </div>
    );
};
