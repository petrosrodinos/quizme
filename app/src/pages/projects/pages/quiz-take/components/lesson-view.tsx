import { useState, type ReactNode, type RefObject } from "react";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Markdown } from "@/components/ui/markdown";
import { Illo, Mascot } from "@/components/ui/mascot";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AnswerResult, AttemptQuestion } from "@/features/quizzes/interfaces/quizzes.interfaces";
import { getQuestionTypeLabel } from "@/config/constants/dropdowns/quizzes/question-type-form.options";
import { cn } from "@/lib/utils";

interface LessonViewProps {
    cardRef: RefObject<HTMLDivElement | null>;
    question: AttemptQuestion;
    index: number;
    total: number;
    answeredCount: number;
    combo: number;
    showCombo: boolean;
    result: AnswerResult | undefined;
    ready: boolean;
    checking: boolean;
    finishing: boolean;
    isLast: boolean;
    /** The answer input (QuestionInput). */
    input: ReactNode;
    /** Explanation / evaluation / source shown in the feedback sheet. */
    details: ReactNode;
    hasDetails: boolean;
    onCheck: () => void;
    onNext: () => void;
    onExit: () => void;
}

const PRAISE = ["lesson.great", "lesson.amazing", "lesson.nice"] as const;

/** Full-screen, Duolingo-style lesson: fat progress bar, mascot + prompt bubble, sticky Check / Continue sheet. */
export const LessonView = ({
    cardRef,
    question,
    index,
    total,
    answeredCount,
    combo,
    showCombo,
    result,
    ready,
    checking,
    finishing,
    isLast,
    input,
    details,
    hasDetails,
    onCheck,
    onNext,
    onExit,
}: LessonViewProps) => {
    const { t } = useTranslation("playful");
    const { t: tq } = useTranslation("quiz");
    const [quitOpen, setQuitOpen] = useState(false);
    const [showWhy, setShowWhy] = useState(false);
    const correct = !!result?.is_correct;
    const partial = !!result && !correct && (result.score ?? 0) > 0;
    const tone = !result ? null : correct ? "correct" : partial ? "partial" : "wrong";
    const toneColor = tone === "correct" ? "var(--pf-green)" : tone === "partial" ? "var(--pf-orange)" : "var(--pf-red)";
    const toneRidge = tone === "correct" ? "var(--pf-green-ridge)" : tone === "partial" ? "var(--pf-orange-ridge)" : "var(--pf-red-ridge)";

    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-30 bg-background pt-[env(safe-area-inset-top)]">
                <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
                    <button type="button" onClick={() => setQuitOpen(true)} className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted" aria-label={t("lesson.quit")}>
                        <X className="size-7" strokeWidth={2.8} />
                    </button>
                    <Progress value={(answeredCount / total) * 100} className="flex-1" aria-label={tq("player.progress")} />
                    {showCombo && combo >= 2 ? (
                        <span className="inline-flex items-center gap-0.5 text-[15px] font-black text-[var(--pf-orange)]" aria-label={t("lesson.combo", { count: combo })}>
                            <Illo name="flame" className="size-7" />
                            {combo}
                        </span>
                    ) : (
                        <span className="text-sm font-black tabular-nums text-muted-foreground">
                            {index + 1}/{total}
                        </span>
                    )}
                </div>
            </header>

            <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-4 pb-56 pt-4 sm:pt-8">
                <div ref={cardRef} key={question.id} className="animate-pop">
                    <p className="mb-4 text-sm font-extrabold uppercase tracking-wide text-[var(--pf-purple)]">{getQuestionTypeLabel(question.type)}</p>
                    <div className="mb-8 flex items-end gap-2 sm:gap-4">
                        <Mascot pose={tone === "wrong" ? "sad" : tone === "correct" ? "celebrate" : "think"} className="size-20 shrink-0 sm:size-28" />
                        <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-border px-4 py-3 text-lg font-bold leading-snug sm:text-xl">
                            <span className="absolute -left-[9px] bottom-6 size-4 rotate-45 border-b-2 border-l-2 border-border bg-background" aria-hidden />
                            <Markdown content={question.prompt} />
                        </div>
                    </div>
                    {input}
                </div>
            </main>

            <footer
                className={cn("fixed inset-x-0 bottom-0 z-30 border-t-2 pb-[env(safe-area-inset-bottom)]", tone ? "pf-sheet-up border-transparent" : "border-border bg-background")}
                style={tone ? { background: `color-mix(in srgb, ${toneColor} 16%, var(--background))` } : undefined}
            >
                <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:py-6">
                    {tone && (
                        <div role="status" aria-live="polite" className="mb-4">
                            <div className="flex items-center gap-3" style={{ color: toneRidge }}>
                                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background">
                                    {correct ? <Check className="size-6" strokeWidth={4} /> : <X className="size-6" strokeWidth={4} />}
                                </span>
                                <span className="text-xl font-black sm:text-2xl">
                                    {correct ? t(PRAISE[index % PRAISE.length]) : partial ? t("lesson.partial", { percent: Math.round((result?.score ?? 0) * 100) }) : t("lesson.incorrect")}
                                </span>
                            </div>
                            {hasDetails && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowWhy((v) => !v)}
                                        aria-expanded={showWhy}
                                        className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold uppercase tracking-wide"
                                        style={{ color: toneRidge }}
                                    >
                                        {showWhy ? t("lesson.hideWhy") : t("lesson.showWhy")}
                                        <ChevronDown className={cn("size-4 transition-transform", showWhy && "rotate-180")} />
                                    </button>
                                    {showWhy && <div className="mt-3 max-h-[40dvh] space-y-3 overflow-y-auto rounded-2xl bg-background p-4 text-sm">{details}</div>}
                                </>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end">
                        {!result ? (
                            <Button size="lg" className="w-full sm:w-44" onClick={onCheck} disabled={!ready || checking}>
                                {checking ? (
                                    <>
                                        <Loader2 className="animate-spin" /> {question.type === "FREE_TEXT" ? tq("player.grading") : tq("player.checking")}
                                    </>
                                ) : (
                                    t("lesson.check")
                                )}
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                autoFocus
                                loading={finishing}
                                onClick={onNext}
                                className={cn("w-full sm:w-44", tone === "wrong" && "pf-btn-red", tone === "partial" && "pf-btn-orange")}
                            >
                                {isLast ? tq("player.seeResults") : t("lesson.continue")}
                            </Button>
                        )}
                    </div>
                </div>
            </footer>

            <Dialog open={quitOpen} onOpenChange={setQuitOpen}>
                <DialogContent className="flex flex-col items-center text-center sm:max-w-sm">
                    <Mascot pose="sad" className="size-32" />
                    <DialogTitle className="text-2xl font-black">{t("lesson.quitTitle")}</DialogTitle>
                    <DialogDescription className="font-semibold">{t("lesson.quitDescription")}</DialogDescription>
                    <div className="mt-2 flex w-full flex-col gap-2">
                        <Button size="lg" className="w-full pf-btn-blue" onClick={() => setQuitOpen(false)} autoFocus>
                            {t("lesson.keepLearning")}
                        </Button>
                        <Button size="lg" variant="ghost" className="w-full text-destructive" onClick={onExit}>
                            {t("lesson.endSession")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
