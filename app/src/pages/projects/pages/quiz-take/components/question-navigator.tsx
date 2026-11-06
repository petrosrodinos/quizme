import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionNavigatorProps {
    total: number;
    current: number;
    answered: Set<number>;
    flagged: Set<number>;
    onSelect: (index: number) => void;
}

/** Exam question grid: answered / flagged / current at a glance. */
export const QuestionNavigator = ({ total, current, answered, flagged, onSelect }: QuestionNavigatorProps) => (
    <nav aria-label="Question navigator" className="space-y-3">
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
            {Array.from({ length: total }).map((_, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onSelect(i)}
                    aria-current={i === current ? "step" : undefined}
                    aria-label={`Question ${i + 1}${answered.has(i) ? ", answered" : ""}${flagged.has(i) ? ", flagged" : ""}`}
                    className={cn(
                        "relative flex h-9 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        answered.has(i) ? "border-primary/40 bg-primary/12 text-foreground" : "border-border bg-card text-muted-foreground",
                        i === current && "ring-2 ring-primary",
                    )}
                >
                    {i + 1}
                    {flagged.has(i) && <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-amber text-amber" aria-hidden />}
                </button>
            ))}
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary/30" /> Answered
            </span>
            <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm border border-border" /> Unanswered
            </span>
            <span className="inline-flex items-center gap-1">
                <Flag className="h-3 w-3 fill-amber text-amber" /> Flagged
            </span>
        </div>
    </nav>
);
