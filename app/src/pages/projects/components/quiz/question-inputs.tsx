import { useEffect, useMemo, useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Link2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnswerValue, AttemptQuestion, CorrectAnswer } from "@/features/quizzes/interfaces/quizzes.interfaces";
import type { MatchingPair } from "@/features/questions/interfaces/questions.interfaces";

export interface QuestionInputProps {
    question: AttemptQuestion;
    value: AnswerValue;
    onChange: (value: AnswerValue) => void;
    /** Locks the input (answer submitted / review). */
    disabled?: boolean;
    /** When present, the correct answer is revealed with highlighting. */
    correct?: CorrectAnswer | null;
    /** Enables keyboard shortcuts (only for the active question). */
    keyboard?: boolean;
    onSubmitShortcut?: () => void;
}

const optionKey = (i: number) => String.fromCharCode(65 + i);

const isEditableTarget = (t: EventTarget | null) => t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

/** Multiple choice (single or multi-select). Number keys 1-6 toggle options. */
export const ChoiceInput = ({ question, value, onChange, disabled, correct, keyboard }: QuestionInputProps) => {
    const options = question.payload.options ?? [];
    const multi = question.type === "MULTI_SELECT";
    const selected = value.selected ?? [];
    const correctSet = new Set(correct?.selected ?? []);

    const toggle = (i: number) => {
        if (disabled) return;
        if (multi) onChange({ selected: selected.includes(i) ? selected.filter((s) => s !== i) : [...selected, i] });
        else onChange({ selected: [i] });
    };

    useEffect(() => {
        if (!keyboard || disabled) return;
        const onKey = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
            const n = Number(e.key);
            if (n >= 1 && n <= options.length) {
                e.preventDefault();
                toggle(n - 1);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    return (
        <div className="space-y-2" role={multi ? "group" : "radiogroup"} aria-label="Answer options">
            {multi && !correct && <p className="text-xs text-muted-foreground">Select all that apply ({question.payload.select_count} correct).</p>}
            {options.map((opt, i) => {
                const isSel = selected.includes(i);
                const isCorrect = correct && correctSet.has(i);
                const isWrongPick = correct && isSel && !correctSet.has(i);
                return (
                    <button
                        key={i}
                        type="button"
                        role={multi ? "checkbox" : "radio"}
                        aria-checked={isSel}
                        disabled={disabled}
                        onClick={() => toggle(i)}
                        className={cn(
                            "group flex w-full items-start gap-3 rounded-xl border bg-card px-4 py-3 text-left text-[15px] leading-snug transition-all",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                            !correct && isSel && "border-primary bg-primary/8 ring-1 ring-primary",
                            !correct && !isSel && "border-border hover:border-primary/50 hover:bg-surface",
                            isCorrect && "animate-pop border-success bg-success/10 ring-1 ring-success",
                            isWrongPick && "animate-shake-x border-destructive bg-destructive/8 ring-1 ring-destructive",
                            correct && !isCorrect && !isWrongPick && "border-border opacity-70",
                        )}
                    >
                        <span
                            className={cn(
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                                isSel && !correct ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                                isCorrect && "border-success bg-success text-white",
                                isWrongPick && "border-destructive bg-destructive text-white",
                            )}
                            aria-hidden
                        >
                            {isCorrect ? <Check className="h-3.5 w-3.5" /> : isWrongPick ? <X className="h-3.5 w-3.5" /> : optionKey(i)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {!disabled && <kbd className="hidden text-[11px] text-muted-foreground sm:inline">{i + 1}</kbd>}
                    </button>
                );
            })}
        </div>
    );
};

/** True / False. Keys T/F or 1/2. */
export const TrueFalseInput = ({ value, onChange, disabled, correct, keyboard }: QuestionInputProps) => {
    useEffect(() => {
        if (!keyboard || disabled) return;
        const onKey = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target) || e.metaKey || e.ctrlKey) return;
            const k = e.key.toLowerCase();
            if (k === "t" || k === "1") onChange({ value: true });
            if (k === "f" || k === "2") onChange({ value: false });
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });
    return (
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="True or false">
            {[true, false].map((v) => {
                const isSel = value.value === v;
                const isCorrect = correct && correct.value === v;
                const isWrongPick = correct && isSel && correct.value !== v;
                return (
                    <button
                        key={String(v)}
                        type="button"
                        role="radio"
                        aria-checked={isSel}
                        disabled={disabled}
                        onClick={() => onChange({ value: v })}
                        className={cn(
                            "rounded-xl border bg-card px-4 py-5 text-base font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            !correct && isSel && "border-primary bg-primary/8 ring-1 ring-primary",
                            !correct && !isSel && "border-border hover:border-primary/50 hover:bg-surface",
                            isCorrect && "animate-pop border-success bg-success/10 ring-1 ring-success",
                            isWrongPick && "animate-shake-x border-destructive bg-destructive/8 ring-1 ring-destructive",
                            correct && !isCorrect && !isWrongPick && "opacity-60",
                        )}
                    >
                        {v ? "True" : "False"}
                        <span className="ml-2 hidden text-[11px] text-muted-foreground sm:inline">({v ? "T" : "F"})</span>
                    </button>
                );
            })}
        </div>
    );
};

export const FillBlankInput = ({ value, onChange, disabled, correct, onSubmitShortcut, keyboard }: QuestionInputProps) => (
    <div className="space-y-2">
        <Input
            autoFocus={keyboard}
            value={value.text ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ text: e.target.value })}
            onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmitShortcut?.();
                }
            }}
            placeholder="Type the missing term…"
            aria-label="Your answer"
            className={cn("h-12 text-base", correct && "border-border")}
        />
        {correct && (
            <p className="text-sm text-muted-foreground">
                Accepted answer: <span className="font-medium text-success">{correct.text}</span>
                {correct.accepted && correct.accepted.length > 1 && <span> (also: {correct.accepted.slice(1).join(", ")})</span>}
            </p>
        )}
    </div>
);

export const FreeTextInput = ({ value, onChange, disabled, onSubmitShortcut, keyboard }: QuestionInputProps) => (
    <div className="space-y-1.5">
        <Textarea
            autoFocus={keyboard}
            value={value.text ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ text: e.target.value })}
            onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onSubmitShortcut?.();
                }
            }}
            rows={6}
            maxLength={6000}
            placeholder="Write your answer in your own words…"
            aria-label="Your answer"
            className="text-[15px] leading-relaxed"
        />
        {!disabled && <p className="text-right text-xs text-muted-foreground">{(value.text ?? "").length}/6000 · Ctrl+Enter to submit</p>}
    </div>
);

const PAIR_COLORS = ["bg-[#cc785c]", "bg-[#5db8a6]", "bg-[#e8a55a]", "bg-[#6b8fd6]", "bg-[#b07cc6]", "bg-[#5db872]"];

/** Click a left item then a right item to pair them (fully keyboard operable via Tab + Enter). */
export const MatchingInput = ({ question, value, onChange, disabled, correct }: QuestionInputProps) => {
    const left = question.payload.left ?? [];
    const right = question.payload.right ?? [];
    const pairs = value.pairs ?? [];
    const [activeLeft, setActiveLeft] = useState<string | null>(null);
    const pairIndex = (l: string) => pairs.findIndex((p) => p.left === l);
    const rightOwner = (r: string) => pairs.find((p) => p.right === r)?.left ?? null;
    const correctMap = useMemo(() => new Map((correct?.pairs ?? []).map((p) => [p.left, p.right])), [correct]);

    const pick = (r: string) => {
        if (disabled || !activeLeft) return;
        const next: MatchingPair[] = pairs.filter((p) => p.left !== activeLeft && p.right !== r);
        next.push({ left: activeLeft, right: r });
        onChange({ pairs: next });
        const remaining = left.find((l) => l !== activeLeft && !next.some((p) => p.left === l));
        setActiveLeft(remaining ?? null);
    };

    const colorFor = (l: string | null) => {
        if (!l) return null;
        const idx = left.indexOf(l);
        return PAIR_COLORS[idx % PAIR_COLORS.length];
    };

    if (correct) {
        return (
            <div className="space-y-2">
                {left.map((l) => {
                    const given = pairs.find((p) => p.left === l)?.right;
                    const ok = given === correctMap.get(l);
                    return (
                        <div key={l} className={cn("rounded-xl border p-3 text-sm", ok ? "border-success/60 bg-success/8" : "border-destructive/50 bg-destructive/5")}>
                            <div className="flex items-start gap-2">
                                {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                                <div className="flex-1">
                                    <span className="font-medium">{l}</span>
                                    <span className="text-muted-foreground"> → </span>
                                    <span className={ok ? "" : "line-through opacity-70"}>{given ?? "—"}</span>
                                    {!ok && <div className="mt-1 text-success">Correct: {correctMap.get(l)}</div>}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Select an item on the left, then its match on the right. Select a matched item again to change it.</p>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2" aria-label="Items">
                    {left.map((l) => {
                        const idx = pairIndex(l);
                        const color = idx >= 0 ? colorFor(l) : null;
                        return (
                            <button
                                key={l}
                                type="button"
                                disabled={disabled}
                                aria-pressed={activeLeft === l}
                                onClick={() => setActiveLeft(l)}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    activeLeft === l ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50",
                                )}
                            >
                                <span className={cn("h-3 w-3 shrink-0 rounded-full border border-border", color)} aria-hidden />
                                <span className="flex-1">{l}</span>
                                {idx >= 0 && <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-label="matched" />}
                            </button>
                        );
                    })}
                </div>
                <div className="space-y-2" aria-label="Matches">
                    {right.map((r) => {
                        const owner = rightOwner(r);
                        return (
                            <button
                                key={r}
                                type="button"
                                disabled={disabled || !activeLeft}
                                onClick={() => pick(r)}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    activeLeft ? "border-border hover:border-primary/60 hover:bg-surface" : "border-border",
                                    "disabled:cursor-not-allowed",
                                )}
                            >
                                <span className={cn("h-3 w-3 shrink-0 rounded-full border border-border", colorFor(owner))} aria-hidden />
                                <span className="flex-1">{r}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
                {pairs.length}/{left.length} matched
            </p>
        </div>
    );
};

/** Reorder via drag-and-drop or the up/down buttons (keyboard accessible). */
export const OrderingInput = ({ question, value, onChange, disabled, correct }: QuestionInputProps) => {
    const order = value.order?.length ? value.order : question.payload.items ?? [];
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!value.order?.length && order.length && !disabled) onChange({ order });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    const move = (from: number, to: number) => {
        if (disabled || to < 0 || to >= order.length) return;
        const next = [...order];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        onChange({ order: next });
    };

    const onDrop = (e: DragEvent, to: number) => {
        e.preventDefault();
        if (dragIndex !== null) move(dragIndex, to);
        setDragIndex(null);
    };

    return (
        <ol className="space-y-2" aria-label="Items to order">
            {order.map((item, i) => {
                const ok = correct ? correct.order?.[i] === item : null;
                return (
                    <li
                        key={item}
                        draggable={!disabled}
                        onDragStart={() => setDragIndex(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onDrop(e, i)}
                        className={cn(
                            "flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm",
                            dragIndex === i && "opacity-50",
                            ok === true && "border-success/60 bg-success/8",
                            ok === false && "border-destructive/50 bg-destructive/5",
                            ok === null && "border-border",
                        )}
                    >
                        {!disabled && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />}
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-card text-xs font-semibold">{i + 1}</span>
                        <span className="flex-1">{item}</span>
                        {ok === false && <span className="text-xs text-success">→ #{(correct?.order?.indexOf(item) ?? 0) + 1}</span>}
                        {!disabled && (
                            <div className="flex gap-1">
                                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move "${item}" up`}>
                                    <ArrowUp />
                                </Button>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => move(i, i + 1)}
                                    disabled={i === order.length - 1}
                                    aria-label={`Move "${item}" down`}
                                >
                                    <ArrowDown />
                                </Button>
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
};

/** Dispatches to the right input for the question type. */
export const QuestionInput = (props: QuestionInputProps) => {
    switch (props.question.type) {
        case "MCQ":
        case "MULTI_SELECT":
            return <ChoiceInput {...props} />;
        case "TRUE_FALSE":
            return <TrueFalseInput {...props} />;
        case "FILL_BLANK":
            return <FillBlankInput {...props} />;
        case "FREE_TEXT":
            return <FreeTextInput {...props} />;
        case "MATCHING":
            return <MatchingInput {...props} />;
        case "ORDERING":
            return <OrderingInput {...props} />;
        default:
            return null;
    }
};

/** Whether the learner has provided enough of an answer to submit. */
export const isAnswerReady = (q: AttemptQuestion, v: AnswerValue): boolean => {
    switch (q.type) {
        case "MCQ":
        case "MULTI_SELECT":
            return (v.selected?.length ?? 0) > 0;
        case "TRUE_FALSE":
            return typeof v.value === "boolean";
        case "MATCHING":
            return (v.pairs?.length ?? 0) === (q.payload.left?.length ?? 0);
        case "ORDERING":
            return (v.order?.length ?? 0) > 0;
        default:
            return !!v.text?.trim();
    }
};
