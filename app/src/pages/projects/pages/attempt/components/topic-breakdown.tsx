import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { TopicBreakdown as TopicBreakdownRow } from "@/features/quizzes/interfaces/quizzes.interfaces";

export const masteryTone = (p: number) => (p >= 85 ? "bg-success" : p >= 70 ? "bg-teal" : p >= 50 ? "bg-amber" : "bg-destructive");

interface TopicBreakdownProps {
    rows: TopicBreakdownRow[];
    reduceMotion?: boolean;
}

export const TopicBreakdown = ({ rows, reduceMotion }: TopicBreakdownProps) => {
    return (
    <ul className="space-y-3">
        {rows.map((t) => (
            <li key={t.topic_id ?? t.topic}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{t.topic}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                        {t.correct}/{t.total} · {t.percentage}%
                    </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-card" role="progressbar" aria-valuenow={t.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={t.topic}>
                    <motion.div
                        className={cn("h-full rounded-full", masteryTone(t.percentage))}
                        initial={{ width: reduceMotion ? `${t.percentage}%` : 0 }}
                        animate={{ width: `${t.percentage}%` }}
                        transition={{ duration: reduceMotion ? 0 : 0.8, ease: "easeOut" }}
                    />
                </div>
            </li>
        ))}
    </ul>
    );
};
