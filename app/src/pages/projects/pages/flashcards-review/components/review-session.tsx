import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Layers, RotateCcw, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useFeedback } from "@/hooks/use-feedback";
import { cn } from "@/lib/utils";
import { celebrate } from "@/lib/celebrate";
import { useReviewFlashcard, useReviewQueue } from "@/features/flashcards/hooks/use-flashcards";
import { useRealtimeEvent } from "@/features/realtime/hooks/use-realtime";
import { RealtimeEvents } from "@/features/realtime/interfaces/realtime-events.constants";
import type { ReviewCard, ReviewRating } from "@/features/flashcards/interfaces/flashcards.interfaces";
import { ReviewRatingOptions } from "@/config/constants/dropdowns/flashcards/review-rating.options";
import { useTranslation } from "react-i18next";

interface ReviewSessionProps {
    /** Omit for a cross-project daily review. */
    projectId?: string;
    onFinish?: () => void;
    limit?: number;
}

const ratingTone: Record<ReviewRating, string> = {
    AGAIN: "border-destructive/40 hover:bg-destructive/10 text-destructive",
    HARD: "border-amber/50 hover:bg-amber/10 text-amber",
    GOOD: "border-success/50 hover:bg-success/10 text-success",
    EASY: "border-teal/50 hover:bg-teal/10 text-teal",
};

/** Localises server interval previews such as "10m", "3h", "4d". */
const useIntervalLabel = () => {
    const { t } = useTranslation("flashcards");
    return (value?: string) => {
        const m = /^(\d+)([mhd])$/.exec(value ?? "");
        return m ? t(`intervals.${m[2]}`, { count: Number(m[1]) }) : (value ?? "");
    };
};

const MAX_REQUEUES = 3;
const EXIT_MS = 260;

/** Distraction-free spaced-repetition session (project or cross-project). */
export const ReviewSession = ({ projectId, onFinish, limit = 40 }: ReviewSessionProps) => {
    const { t } = useTranslation("flashcards");
    const intervalLabel = useIntervalLabel();
    const queryClient = useQueryClient();
    const { data, isPending, refetch, isFetching } = useReviewQueue(projectId, { limit });
    const review = useReviewFlashcard();
    const { play, haptic, reduceMotion } = useFeedback();

    const [queue, setQueue] = useState<ReviewCard[]>([]);
    const [flipped, setFlipped] = useState(false);
    const [exiting, setExiting] = useState<ReviewRating | null>(null);
    const [done, setDone] = useState(false);
    const [stats, setStats] = useState({ reviewed: 0, remembered: 0, forgotten: 0, xp: 0 });
    const requeues = useRef<Map<string, number>>(new Map());
    const shownAt = useRef(Date.now());
    const startedAt = useRef(Date.now());
    const [elapsedSec, setElapsedSec] = useState(0);
    const initialCount = useRef(0);

    useEffect(() => {
        if (!data) return;
        setQueue(data.cards);
        initialCount.current = data.cards.length;
        requeues.current = new Map();
        setStats({ reviewed: 0, remembered: 0, forgotten: 0, xp: 0 });
        setDone(false);
        setFlipped(false);
        startedAt.current = Date.now();
        shownAt.current = Date.now();
    }, [data]);

    useRealtimeEvent<{ amount: number; source_type?: string }>(RealtimeEvents.XP_GAINED, (p) => {
        if (p.source_type === "card_review" && !done) setStats((s) => ({ ...s, xp: s.xp + p.amount }));
    });

    const current = queue[0];

    const finish = useCallback(() => {
        setDone(true);
        setElapsedSec(Math.round((Date.now() - startedAt.current) / 1000));
        queryClient.invalidateQueries({ queryKey: ["flashcard-stats"] });
        queryClient.invalidateQueries({ queryKey: ["flashcards"] });
        queryClient.invalidateQueries({ queryKey: ["decks"] });
        queryClient.invalidateQueries({ queryKey: ["gamification-profile"] });
        play("goal");
        celebrate("side");
    }, [queryClient, play]);

    const flip = useCallback(() => {
        if (!current || exiting) return;
        setFlipped((f) => !f);
        play("flip");
    }, [current, exiting, play]);

    const rate = useCallback(
        (rating: ReviewRating) => {
            if (!current || !flipped || exiting) return;
            const time_spent_ms = Math.min(600_000, Date.now() - shownAt.current);
            review.mutate({ id: current.id, rating, time_spent_ms });
            const remembered = rating === "GOOD" || rating === "EASY";
            play(remembered ? "correct" : rating === "AGAIN" ? "wrong" : "xp");
            haptic(remembered ? "correct" : "wrong");
            setStats((s) => ({ ...s, reviewed: s.reviewed + 1, remembered: s.remembered + (remembered ? 1 : 0), forgotten: s.forgotten + (rating === "AGAIN" ? 1 : 0) }));
            setExiting(rating);
            window.setTimeout(
                () => {
                    setQueue((q) => {
                        const [head, ...rest] = q;
                        const n = requeues.current.get(head.id) ?? 0;
                        if (rating === "AGAIN" && n < MAX_REQUEUES) {
                            requeues.current.set(head.id, n + 1);
                            return [...rest, head];
                        }
                        return rest;
                    });
                    setFlipped(false);
                    setExiting(null);
                    shownAt.current = Date.now();
                },
                reduceMotion ? 0 : EXIT_MS,
            );
        },
        [current, flipped, exiting, review, play, haptic, reduceMotion],
    );

    useEffect(() => {
        if (data && !done && queue.length === 0 && stats.reviewed > 0 && !exiting) finish();
    }, [queue.length, data, done, stats.reviewed, exiting, finish]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
            if (done || !current) return;
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                flip();
            } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
                e.preventDefault();
                rate(ReviewRatingOptions[Number(e.key) - 1].id);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [flip, rate, flipped, current, done]);

    const progress = useMemo(() => {
        const total = Math.max(initialCount.current, stats.reviewed + queue.length);
        return total ? Math.round((stats.reviewed / total) * 100) : 0;
    }, [stats.reviewed, queue.length]);

    if (isPending) {
        return (
            <div className="mx-auto max-w-2xl space-y-4">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-72 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    if (done) {
        const accuracy = stats.reviewed ? Math.round((stats.remembered / stats.reviewed) * 100) : 0;
        return (
            <section aria-label={t("review.summary.ariaLabel")} className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" aria-hidden />
                <h2 className="font-display text-3xl">{t("review.summary.title")}</h2>
                <p className="mt-1 text-muted-foreground">{t("review.summary.description")}</p>
                <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                        { icon: Layers, label: t("review.summary.reviewed"), value: stats.reviewed, suffix: "" },
                        { icon: Target, label: t("review.summary.remembered"), value: accuracy, suffix: "%" },
                        { icon: Sparkles, label: t("review.summary.xp"), value: stats.xp, suffix: "" },
                        { icon: Clock, label: t("review.summary.minutes"), value: Math.max(1, Math.round(elapsedSec / 60)), suffix: "" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-surface p-4">
                            <s.icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" aria-hidden />
                            <dt className="text-xs text-muted-foreground">{s.label}</dt>
                            <dd className="font-display text-3xl">
                                <AnimatedCounter value={s.value} suffix={s.suffix} />
                            </dd>
                        </div>
                    ))}
                </dl>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={() => refetch()} loading={isFetching}>
                        <RotateCcw /> {t("review.summary.checkMore")}
                    </Button>
                    {onFinish && <Button onClick={onFinish}>{t("common:actions.done")}</Button>}
                </div>
            </section>
        );
    }

    if (!current) {
        return (
            <EmptyState
                icon={CheckCircle2}
                title={t("review.empty.title")}
                description={t("review.empty.description")}
                action={onFinish ? <Button onClick={onFinish}>{t("common:actions.back")}</Button> : undefined}
            />
        );
    }

    const exitClass =
        exiting && !reduceMotion
            ? exiting === "AGAIN"
                ? "-translate-x-24 opacity-0"
                : exiting === "HARD"
                  ? "translate-y-10 opacity-0"
                  : "translate-x-24 opacity-0"
            : "translate-x-0 opacity-100";

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
                <Progress value={progress} className="h-2 flex-1" aria-label={t("review.progressAria")} />
                <span className="tabular-nums">
                    {t("review.progress", { done: stats.reviewed, left: queue.length })}
                </span>
            </div>

            <div className={cn("flip-scene transition-all duration-300 ease-out", exitClass)}>
                <button
                    type="button"
                    onClick={flip}
                    aria-label={flipped ? t("review.showQuestion") : t("review.showAnswer")}
                    className={cn("flip-card relative block min-h-72 w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", flipped && "is-flipped")}
                >
                    <div className="flip-face absolute inset-0 flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm">
                        <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                            <span>{t("review.question")}</span>
                            {current.deck?.name && <span className="normal-case tracking-normal">{current.deck.name}</span>}
                        </div>
                        <div className="flex flex-1 items-center justify-center text-center text-xl">
                            <Markdown content={current.front} />
                        </div>
                        <p className="mt-4 text-center text-xs text-muted-foreground">{t("review.spaceHint")}</p>
                    </div>
                    <div className="flip-face flip-back absolute inset-0 flex flex-col overflow-y-auto rounded-2xl border border-border bg-surface-card p-8 shadow-sm">
                        <div className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">{t("review.answer")}</div>
                        <div className="flex flex-1 items-center justify-center text-center text-lg">
                            <Markdown content={current.back} />
                        </div>
                        {current.source_ref?.document_title && (
                            <p className="mt-4 text-center text-xs text-muted-foreground">
                                {current.source_ref.page
                                    ? t("review.sourceWithPage", { title: current.source_ref.document_title, page: current.source_ref.page })
                                    : t("review.source", { title: current.source_ref.document_title })}
                            </p>
                        )}
                    </div>
                    <div aria-hidden className="invisible min-h-72 p-8" />
                </button>
            </div>

            <div className="mt-6" aria-live="polite">
                {flipped ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={t("review.ratingGroup")}>
                        {ReviewRatingOptions.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => rate(o.id)}
                                disabled={!!exiting}
                                title={o.description}
                                className={cn(
                                    "flex flex-col items-center rounded-xl border bg-card px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                                    ratingTone[o.id],
                                )}
                            >
                                <span>
                                    {o.label} <kbd className="ml-1 rounded border border-border px-1 text-[10px] text-muted-foreground">{o.key}</kbd>
                                </span>
                                <span className="mt-0.5 text-xs font-normal text-muted-foreground">{intervalLabel(current.intervals?.[o.id])}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <Button className="w-full" size="lg" onClick={flip}>
                        {t("review.showAnswer")}
                    </Button>
                )}
            </div>
        </div>
    );
};
